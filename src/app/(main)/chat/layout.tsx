"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import { usePresence } from "@/hooks/usePresence";
import { getConversations } from "@/actions/conversations";
import { Sidebar } from "@/components/sidebar/Sidebar";
import type { ConversationWithDetails } from "@/types";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [conversations, setConversations] = useState<(ConversationWithDetails & { unreadCount: number })[]>([]);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [showSidebar, setShowSidebar] = useState(true);
    const [isDark, setIsDark] = useState(false);

    const { isConnected, on } = useSocket(session?.user?.id);
    const { isUserOnline, getTypingUsersForConversation, startTyping, stopTyping } =
        usePresence(session?.user?.id);

    // Dark mode toggle
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
        if (session?.user) {
            fetchConversations();
        }
    }, [session, fetchConversations]);

    // Listen for real-time conversation updates
    useEffect(() => {
        if (!session?.user?.id) return;

        const unsub1 = on("conversationUpdated", () => {
            fetchConversations();
        });

        const unsub2 = on("newMessage", () => {
            fetchConversations();
        });

        return () => {
            unsub1();
            unsub2();
        };
    }, [session, on, fetchConversations]);

    const handleSelectConversation = useCallback(
        (conversationId: string) => {
            setSelectedConversationId(conversationId);
            router.push(`/chat/${conversationId}`);
            // On mobile, hide sidebar
            if (window.innerWidth < 768) {
                setShowSidebar(false);
            }
        },
        [router]
    );

    const handleBackToSidebar = useCallback(() => {
        setShowSidebar(true);
        setSelectedConversationId(null);
        router.push("/chat");
    }, [router]);

    if (status === "loading") {
        return (
            <div className="h-screen flex items-center justify-center" style={{ backgroundColor: "var(--wa-bg)" }}>
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "var(--wa-green)" }}>
                        <svg viewBox="0 0 39 39" width="32" height="32" fill="white">
                            <path d="M10.7 32.8l.6.3c2.5 1.5 5.3 2.2 8.1 2.2 8.8 0 16-7.2 16-16 0-4.2-1.7-8.3-4.7-11.3s-7-4.7-11.3-4.7c-8.8 0-16 7.2-15.9 16.1 0 3 .9 5.9 2.4 8.4l.4.6-1.6 5.9 6-1.5z" />
                        </svg>
                    </div>
                    <p style={{ color: "var(--wa-text-secondary)" }}>Loading WhatsApp...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex overflow-hidden" style={{ backgroundColor: "var(--wa-bg)" }}>
            {/* Top green bar */}
            <div className="fixed top-0 left-0 right-0 h-32 z-0" style={{ backgroundColor: "var(--wa-teal)" }} />

            {/* Main container */}
            <div className="relative z-10 flex w-full max-w-[1600px] mx-auto my-4 shadow-xl rounded-sm overflow-hidden"
                style={{ height: "calc(100vh - 2rem)" }}>
                {/* Sidebar */}
                <div
                    className={`${showSidebar ? "flex" : "hidden md:flex"
                        } flex-col w-full md:w-[420px] md:min-w-[340px] border-r`}
                    style={{ backgroundColor: "var(--wa-sidebar-bg)", borderColor: "var(--wa-border)" }}
                >
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
                </div>

                {/* Chat area */}
                <div
                    className={`${!showSidebar ? "flex" : "hidden md:flex"
                        } flex-1 flex-col min-w-0`}
                    style={{ backgroundColor: "var(--wa-chat-bg)" }}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}
