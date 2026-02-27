"use client";

import { getInitials, formatLastSeen } from "@/lib/utils";
import type { ConversationWithDetails, SafeUser } from "@/types";

interface ChatHeaderProps {
    conversation: ConversationWithDetails | null;
    otherUser?: SafeUser;
    isOnline: boolean;
    typingUsers: { userId: string; userName: string }[];
    onBack: () => void;
}

export function ChatHeader({
    conversation,
    otherUser,
    isOnline,
    typingUsers,
    onBack,
}: ChatHeaderProps) {
    if (!conversation) {
        return (
            <div className="flex items-center px-4 py-3 min-h-[60px]" style={{ backgroundColor: "var(--wa-header-bg)" }}>
                <div className="animate-pulse flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full" style={{ backgroundColor: "var(--wa-border)" }} />
                    <div className="h-4 w-32 rounded" style={{ backgroundColor: "var(--wa-border)" }} />
                </div>
            </div>
        );
    }

    const name = conversation.isGroup
        ? conversation.name || "Group"
        : otherUser?.name || "Unknown";

    const statusText =
        typingUsers.length > 0
            ? conversation.isGroup
                ? `${typingUsers.map((t) => t.userName).join(", ")} typing...`
                : "typing..."
            : conversation.isGroup
                ? `${conversation.members.length} members`
                : isOnline
                    ? "online"
                    : otherUser?.lastSeen
                        ? `last seen ${formatLastSeen(otherUser.lastSeen)}`
                        : "offline";

    return (
        <div
            className="flex items-center gap-3 px-4 py-2 min-h-[60px] border-b"
            style={{ backgroundColor: "var(--wa-header-bg)", borderColor: "var(--wa-border)" }}
        >
            {/* Back button (mobile) */}
            <button onClick={onBack} className="md:hidden p-1 -ml-1 mr-1">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--wa-text)" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
            </button>

            {/* Avatar */}
            <div className="relative flex-shrink-0">
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white"
                    style={{
                        backgroundColor: conversation.isGroup
                            ? "var(--wa-green)"
                            : "#" + (otherUser?.id || "000000").slice(0, 6),
                    }}
                >
                    {conversation.isGroup ? "G" : getInitials(name)}
                </div>
                {!conversation.isGroup && isOnline && (
                    <div
                        className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                        style={{
                            backgroundColor: "var(--wa-green)",
                            borderColor: "var(--wa-header-bg)",
                        }}
                    />
                )}
            </div>

            {/* Name & Status */}
            <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium truncate" style={{ color: "var(--wa-text)" }}>
                    {name}
                </h3>
                <p
                    className="text-xs truncate"
                    style={{
                        color:
                            typingUsers.length > 0
                                ? "var(--wa-green)"
                                : isOnline
                                    ? "var(--wa-green)"
                                    : "var(--wa-text-secondary)",
                    }}
                >
                    {typingUsers.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                            {statusText}
                            <span className="inline-flex gap-0.5">
                                <span className="typing-dot w-1 h-1 rounded-full inline-block" style={{ backgroundColor: "var(--wa-green)" }} />
                                <span className="typing-dot w-1 h-1 rounded-full inline-block" style={{ backgroundColor: "var(--wa-green)" }} />
                                <span className="typing-dot w-1 h-1 rounded-full inline-block" style={{ backgroundColor: "var(--wa-green)" }} />
                            </span>
                        </span>
                    )}
                    {typingUsers.length === 0 && statusText}
                </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
                <button className="p-2 rounded-full hover:bg-black/5 transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--wa-text-secondary)" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                </button>
                <button className="p-2 rounded-full hover:bg-black/5 transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--wa-text-secondary)">
                        <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
