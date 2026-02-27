"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import { formatDate } from "@/lib/utils";
import type { MessageWithSender } from "@/types";

interface MessageListProps {
    messages: MessageWithSender[];
    currentUserId: string;
    isLoading: boolean;
    hasMore: boolean;
    onLoadMore: () => void;
    onReply: (message: MessageWithSender) => void;
    onDelete: (messageId: string, forEveryone: boolean) => void;
    onEdit: (messageId: string, body: string) => void;
    onReact: (messageId: string, emoji: string) => void;
}

export function MessageList({
    messages,
    currentUserId,
    isLoading,
    hasMore,
    onLoadMore,
    onReply,
    onDelete,
    onEdit,
    onReact,
}: MessageListProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    const isAtBottomRef = useRef(true);
    const prevMessageCountRef = useRef(0);

    // Scroll to bottom on new messages (only if already at bottom)
    useEffect(() => {
        if (messages.length > prevMessageCountRef.current && isAtBottomRef.current) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
        prevMessageCountRef.current = messages.length;
    }, [messages.length]);

    // Initial scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView();
    }, []);

    // Detect scroll position
    const handleScroll = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;

        const { scrollTop, scrollHeight, clientHeight } = container;
        isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;
        setShowScrollBtn(!isAtBottomRef.current);

        // Load more when scrolled to top
        if (scrollTop < 50 && hasMore && !isLoading) {
            onLoadMore();
        }
    }, [hasMore, isLoading, onLoadMore]);

    const scrollToBottom = useCallback(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    // Group messages by date
    const groupedMessages: { date: string; messages: MessageWithSender[] }[] = [];
    let currentDate = "";

    messages.forEach((msg) => {
        const dateStr = formatDate(msg.createdAt);
        if (dateStr !== currentDate) {
            currentDate = dateStr;
            groupedMessages.push({ date: dateStr, messages: [msg] });
        } else {
            groupedMessages[groupedMessages.length - 1].messages.push(msg);
        }
    });

    return (
        <div className="relative flex-1 overflow-hidden">
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="h-full overflow-y-auto px-4 md:px-16 py-3 chat-bg"
            >
                {/* Loading indicator */}
                {isLoading && (
                    <div className="flex justify-center py-4">
                        <svg className="animate-spin h-5 w-5" style={{ color: "var(--wa-green)" }} viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    </div>
                )}

                {groupedMessages.map((group, i) => (
                    <div key={group.date + i}>
                        {/* Date separator */}
                        <div className="flex justify-center my-3">
                            <span
                                className="px-3 py-1 rounded-lg text-xs shadow-sm"
                                style={{
                                    backgroundColor: "var(--wa-message-in)",
                                    color: "var(--wa-text-secondary)",
                                }}
                            >
                                {group.date}
                            </span>
                        </div>

                        {group.messages.map((message, j) => (
                            <MessageBubble
                                key={message.id}
                                message={message}
                                isOwn={message.senderId === currentUserId}
                                isFirst={j === 0 || group.messages[j - 1]?.senderId !== message.senderId}
                                currentUserId={currentUserId}
                                onReply={onReply}
                                onDelete={onDelete}
                                onEdit={onEdit}
                                onReact={onReact}
                            />
                        ))}
                    </div>
                ))}

                <div ref={bottomRef} />
            </div>

            {/* Scroll to bottom button */}
            {showScrollBtn && (
                <button
                    onClick={scrollToBottom}
                    className="absolute bottom-4 right-6 w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-all animate-scale-in"
                    style={{ backgroundColor: "var(--wa-message-in)" }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--wa-text-secondary)" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </button>
            )}
        </div>
    );
}
