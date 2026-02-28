"use client";

import { formatLastSeen, getInitials } from "@/lib/utils";
import type { ConversationWithDetails, TypingUser } from "@/types";

interface ChatHeaderProps {
    conversation: ConversationWithDetails | null;
    currentUserId: string;
    isOnline: boolean;
    typingUsers: { userId: string; userName: string }[];
    onBack: () => void;
    onVoiceCall?: () => void;
}

export function ChatHeader({
    conversation,
    currentUserId,
    isOnline,
    typingUsers,
    onBack,
    onVoiceCall,
}: ChatHeaderProps) {
    if (!conversation) return null;

    const otherMember = conversation.members.find((m: any) => m.userId !== currentUserId);
    const name = conversation.isGroup
        ? conversation.name || "Group"
        : otherMember?.user.name || "Unknown";
    const avatar = conversation.isGroup ? null : otherMember?.user.avatar;

    const statusText = typingUsers.length > 0
        ? "typing..."
        : conversation.isGroup
            ? `${conversation.members.length} participants`
            : isOnline
                ? "Online"
                : otherMember?.user.lastSeen
                    ? formatLastSeen(otherMember.user.lastSeen)
                    : "Offline";

    return (
        <div
            className="flex items-center gap-3 px-4 md:px-5 py-3 border-b"
            style={{ backgroundColor: "var(--mc-header-bg)", borderColor: "var(--mc-border)" }}
        >
            {/* Back button - mobile only */}
            <button
                onClick={onBack}
                className="p-1.5 -ml-2 rounded-full transition-colors md:hidden flex-shrink-0 hover-card"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--mc-text)" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
            </button>

            {/* Avatar */}
            <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white overflow-hidden"
                    style={{ backgroundColor: conversation.isGroup ? "var(--mc-primary)" : "#" + (otherMember?.user.id || "888").slice(0, 6) }}>
                    {avatar ? (
                        <img src={avatar} alt={name} className="w-full h-full object-cover" />
                    ) : conversation.isGroup ? "G" : (
                        getInitials(name)
                    )}
                </div>
                {isOnline && !conversation.isGroup && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                        style={{ backgroundColor: "var(--mc-green)", borderColor: "var(--mc-header-bg)" }} />
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <h2 className="text-[15px] font-semibold truncate" style={{ color: "var(--mc-text)" }}>
                    {name}
                </h2>
                <p className="text-[12px] truncate flex items-center gap-1.5"
                    style={{ color: typingUsers.length > 0 ? "var(--mc-primary)" : "var(--mc-text-secondary)" }}>
                    {typingUsers.length > 0 && (
                        <span className="inline-flex gap-0.5 items-end">
                            <span className="w-1.5 h-1.5 rounded-full typing-dot" style={{ backgroundColor: "var(--mc-primary)" }} />
                            <span className="w-1.5 h-1.5 rounded-full typing-dot" style={{ backgroundColor: "var(--mc-primary)" }} />
                            <span className="w-1.5 h-1.5 rounded-full typing-dot" style={{ backgroundColor: "var(--mc-primary)" }} />
                        </span>
                    )}
                    {statusText}
                </p>
            </div>

            {/* Voice call button - 1:1 chats only */}
            {!conversation.isGroup && onVoiceCall && (
                <button
                    onClick={onVoiceCall}
                    className="p-2 rounded-full transition-colors hover-card flex-shrink-0"
                    title="Voice call"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--mc-primary)" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                </button>
            )}

            {/* More button */}
            <button className="p-2 rounded-full transition-colors hover-card flex-shrink-0" title="More">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mc-text-secondary)" strokeWidth="2">
                    <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
                </svg>
            </button>
        </div>
    );
}
