"use client";

import { formatLastSeen, getInitials } from "@/lib/utils";
import type { ConversationWithDetails, SafeUser, TypingUser } from "@/types";

interface ChatHeaderProps {
    conversation: ConversationWithDetails | null;
    currentUserId: string;
    isOnline: boolean;
    typingUsers: TypingUser[];
    onBack: () => void;
}

export function ChatHeader({
    conversation,
    currentUserId,
    isOnline,
    typingUsers,
    onBack,
}: ChatHeaderProps) {
    if (!conversation) return null;

    const otherMember = conversation.members.find((m: any) => m.userId !== currentUserId);
    const name = conversation.isGroup
        ? conversation.name || "Group"
        : otherMember?.user.name || "Unknown";

    const avatarColor = conversation.isGroup
        ? "var(--wa-green)"
        : "#" + (otherMember?.user.id || "000000").slice(0, 6);

    const statusText = typingUsers.length > 0
        ? typingUsers.map((t) => t.userName).join(", ") + " typing..."
        : conversation.isGroup
            ? `${conversation.members.length} participants`
            : isOnline
                ? "online"
                : otherMember?.user.lastSeen
                    ? `last seen ${formatLastSeen(otherMember.user.lastSeen)}`
                    : "offline";

    return (
        <div
            className="flex items-center gap-3 px-3 md:px-4 py-2.5 min-h-[60px] shadow-sm"
            style={{ backgroundColor: "var(--wa-header-bg)" }}
        >
            {/* Back button - mobile only */}
            <button
                onClick={onBack}
                className="p-1.5 -ml-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors md:hidden flex-shrink-0"
            >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--wa-text)" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
            </button>

            {/* Avatar */}
            <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white shadow-sm"
                    style={{ backgroundColor: avatarColor }}>
                    {conversation.isGroup ? "G" : getInitials(name)}
                </div>
                {isOnline && !conversation.isGroup && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-[2px]"
                        style={{ backgroundColor: "#25d366", borderColor: "var(--wa-header-bg)" }} />
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <h2 className="text-[15px] font-semibold truncate" style={{ color: "var(--wa-text)" }}>
                    {name}
                </h2>
                <p className="text-[12px] truncate flex items-center gap-1.5"
                    style={{ color: typingUsers.length > 0 ? "var(--wa-green)" : "var(--wa-text-secondary)" }}>
                    {typingUsers.length > 0 && (
                        <span className="inline-flex gap-0.5 items-end">
                            <span className="w-1.5 h-1.5 rounded-full typing-dot" style={{ backgroundColor: "var(--wa-green)" }} />
                            <span className="w-1.5 h-1.5 rounded-full typing-dot" style={{ backgroundColor: "var(--wa-green)" }} />
                            <span className="w-1.5 h-1.5 rounded-full typing-dot" style={{ backgroundColor: "var(--wa-green)" }} />
                        </span>
                    )}
                    {statusText}
                </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
                <button className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors" title="Search">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--wa-text-secondary)" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                </button>
                <button className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors" title="More">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--wa-text-secondary)" strokeWidth="2">
                        <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
