"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import { usePresence } from "@/hooks/usePresence";
import { useNotifications } from "@/hooks/useNotifications";
import { useVoiceCall } from "@/hooks/useVoiceCall";
import { getConversations } from "@/actions/conversations";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ProfilePanel } from "@/components/sidebar/ProfilePanel";
import { VoiceCallModal } from "@/components/chat/VoiceCallModal";
import type { ConversationWithDetails } from "@/types";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const [conversations, setConversations] = useState<(ConversationWithDetails & { unreadCount: number })[]>([]);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [mobileView, setMobileView] = useState<"sidebar" | "chat">("sidebar");
    const [isDark, setIsDark] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    const { isConnected, on } = useSocket(session?.user?.id);
    const { isUserOnline, getTypingUsersForConversation, startTyping, stopTyping } =
        usePresence(session?.user?.id);
    const { notifications, unreadCount: notificationCount, markAsRead } =
        useNotifications(session?.user?.id);

    // Voice call - at layout level so incoming calls are received on ANY page
    const {
        callState, callInfo, isMuted, formattedDuration,
        startCall, answerCall, endCall, rejectCall, toggleMute,
    } = useVoiceCall(session?.user?.id);

    // Dark mode
    useEffect(() => {
        const saved = localStorage.getItem("theme");
        if (saved === "dark") {
            document.documentElement.classList.add("dark");
            setIsDark(true);
        }
    }, []);

    const toggleDarkMode = useCallback(() => {
        setIsDark((prev) => {
            const next = !prev;
            if (next) {
                document.documentElement.classList.add("dark");
                localStorage.setItem("theme", "dark");
            } else {
                document.documentElement.classList.remove("dark");
                localStorage.setItem("theme", "light");
            }
            return next;
        });
    }, []);

    // Fetch conversations
    const fetchConversations = useCallback(async () => {
        const result = await getConversations();
        if (result.conversations) {
            setConversations(result.conversations as any);
        }
    }, []);

    useEffect(() => {
        if (session?.user) fetchConversations();
    }, [session, fetchConversations]);

    // Real-time updates
    useEffect(() => {
        if (!session?.user?.id) return;
        const unsub1 = on("conversationUpdated", () => fetchConversations());
        const unsub2 = on("newMessage", () => fetchConversations());
        return () => { unsub1(); unsub2(); };
    }, [session, on, fetchConversations]);

    // Track selected conversation from URL
    useEffect(() => {
        const match = pathname?.match(/\/chat\/(.+)/);
        if (match) {
            setSelectedConversationId(match[1]);
            setMobileView("chat");
        } else {
            setMobileView("sidebar");
        }
    }, [pathname]);

    const handleSelectConversation = useCallback(
        (conversationId: string) => {
            setSelectedConversationId(conversationId);
            setMobileView("chat");
            router.push(`/chat/${conversationId}`);
        },
        [router]
    );

    const handleBackToSidebar = useCallback(() => {
        setMobileView("sidebar");
        setSelectedConversationId(null);
        router.push("/chat");
    }, [router]);

    // When user receives an incoming call and answers, navigate to that conversation
    useEffect(() => {
        if (callState === "connected" && callInfo && !callInfo.isOutgoing) {
            router.push(`/chat/${callInfo.conversationId}`);
        }
    }, [callState, callInfo, router]);

    if (status === "loading") {
        return (
            <div className="h-[100dvh] flex items-center justify-center" style={{ backgroundColor: "var(--mc-bg)" }}>
                <div className="text-center animate-fade-in">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center animate-pulse-ring"
                        style={{ backgroundColor: "var(--mc-primary)" }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                    </div>
                    <p className="text-sm font-medium" style={{ color: "var(--mc-text-secondary)" }}>Loading...</p>
                </div>
            </div>
        );
    }

    const isInChat = pathname?.includes("/chat/") && pathname !== "/chat";

    return (
        <div className="h-[100dvh] flex overflow-hidden" style={{ backgroundColor: "var(--mc-bg)" }}>
            {/* ===== LEFT PANEL - Profile ===== */}
            <div
                className={`
                    hidden md:flex flex-col w-[260px] min-w-[260px] border-r flex-shrink-0
                `}
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
                <ProfilePanel
                    isDark={isDark}
                    toggleDarkMode={toggleDarkMode}
                    notificationCount={notificationCount}
                    onNotificationsClick={() => {
                        setShowNotifications(!showNotifications);
                        if (!showNotifications) markAsRead();
                    }}
                />
            </div>

            {/* ===== CENTER - Chat Area ===== */}
            <div
                className={`
                    flex-1 flex flex-col min-w-0
                    ${mobileView === "chat" ? "flex" : "hidden md:flex"}
                `}
                style={{ backgroundColor: "var(--mc-chat-bg)" }}
            >
                {children}
            </div>

            {/* ===== RIGHT PANEL - Contacts/Chats ===== */}
            <div
                className={`
                    w-full md:w-[340px] md:min-w-[300px] border-l flex-shrink-0
                    ${mobileView === "sidebar" ? "flex" : "hidden md:flex"} flex-col
                `}
                style={{ backgroundColor: "var(--mc-sidebar-right)", borderColor: "var(--mc-border)" }}
            >
                {showNotifications ? (
                    <NotificationsPanel
                        notifications={notifications}
                        onClose={() => setShowNotifications(false)}
                        onMarkRead={markAsRead}
                    />
                ) : (
                    <Sidebar
                        conversations={conversations}
                        selectedConversationId={selectedConversationId}
                        onSelectConversation={handleSelectConversation}
                        onConversationCreated={fetchConversations}
                        isUserOnline={isUserOnline}
                        currentUserId={session?.user?.id || ""}
                        isDark={isDark}
                        toggleDarkMode={toggleDarkMode}
                    />
                )}
            </div>

            {/* ===== Voice Call Modal (global, always rendered) ===== */}
            <VoiceCallModal
                callState={callState}
                callInfo={callInfo}
                isMuted={isMuted}
                formattedDuration={formattedDuration}
                onAnswer={answerCall}
                onEnd={endCall}
                onReject={rejectCall}
                onToggleMute={toggleMute}
            />
        </div>
    );
}

// Notifications Panel
function NotificationsPanel({
    notifications,
    onClose,
    onMarkRead,
}: {
    notifications: any[];
    onClose: () => void;
    onMarkRead: (id?: string) => void;
}) {
    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: "var(--mc-border)" }}>
                <h3 className="text-lg font-semibold" style={{ color: "var(--mc-text)" }}>Notifications</h3>
                <div className="flex items-center gap-2">
                    {notifications.some((n) => !n.read) && (
                        <button
                            onClick={() => onMarkRead()}
                            className="text-xs font-medium px-2 py-1 rounded"
                            style={{ color: "var(--mc-primary)" }}
                        >
                            Mark all read
                        </button>
                    )}
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/5">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mc-text-secondary)" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                    <div className="text-center py-16">
                        <svg className="mx-auto mb-3 opacity-20" width="48" height="48" viewBox="0 0 24 24" fill="none"
                            stroke="var(--mc-text-secondary)" strokeWidth="1.5">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        <p className="text-sm" style={{ color: "var(--mc-text-secondary)" }}>No notifications</p>
                    </div>
                ) : (
                    notifications.map((n) => (
                        <div key={n.id} className="px-5 py-3 border-b hover-card"
                            style={{
                                borderColor: "var(--mc-border)",
                                backgroundColor: n.read ? undefined : "var(--mc-selected)",
                            }}>
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                                    style={{ backgroundColor: "var(--mc-primary)", opacity: 0.1 }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mc-primary)" strokeWidth="2">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium" style={{ color: "var(--mc-text)" }}>{n.title}</p>
                                    <p className="text-xs mt-0.5 truncate" style={{ color: "var(--mc-text-secondary)" }}>{n.body}</p>
                                </div>
                                {!n.read && (
                                    <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: "var(--mc-primary)" }} />
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
