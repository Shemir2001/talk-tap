"use client";

import { useRef, useEffect, useState, type ReactNode } from "react";
import { formatDate } from "@/lib/utils";
import type { MessageWithSender } from "@/types";

interface MessageListProps {
    messages: MessageWithSender[];
    isLoading: boolean;
    hasMore: boolean;
    onLoadMore: () => void;
    children: ReactNode;
}

export function MessageList({
    messages,
    isLoading,
    hasMore,
    onLoadMore,
    children,
}: MessageListProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const [showScrollDown, setShowScrollDown] = useState(false);
    const isInitialLoad = useRef(true);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (messages.length > 0 && isInitialLoad.current) {
            bottomRef.current?.scrollIntoView();
            isInitialLoad.current = false;
            return;
        }

        const container = containerRef.current;
        if (!container) return;

        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
        if (isNearBottom) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    // Reset initial load flag
    useEffect(() => {
        isInitialLoad.current = true;
    }, [messages.length === 0]);

    // Scroll detection
    const handleScroll = () => {
        const container = containerRef.current;
        if (!container) return;

        // Load more when scrolled to top
        if (container.scrollTop < 100 && hasMore && !isLoading) {
            onLoadMore();
        }

        // Show/hide scroll-to-bottom
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
        setShowScrollDown(!isNearBottom && messages.length > 5);
    };

    // Date grouping
    const dateSections: { date: string; messagesIdx: number[] }[] = [];
    messages.forEach((msg, idx) => {
        const date = formatDate(msg.createdAt);
        const last = dateSections[dateSections.length - 1];
        if (last && last.date === date) {
            last.messagesIdx.push(idx);
        } else {
            dateSections.push({ date, messagesIdx: [idx] });
        }
    });

    const childrenArray = Array.isArray(children)
        ? children
        : [children];

    return (
        <div
            ref={containerRef}
            className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-12 py-4 chat-bg relative"
            onScroll={handleScroll}
        >
            {/* Load more indicator */}
            {isLoading && (
                <div className="flex justify-center py-4">
                    <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full typing-dot" style={{ backgroundColor: "var(--wa-green)" }} />
                        <div className="w-2 h-2 rounded-full typing-dot" style={{ backgroundColor: "var(--wa-green)" }} />
                        <div className="w-2 h-2 rounded-full typing-dot" style={{ backgroundColor: "var(--wa-green)" }} />
                    </div>
                </div>
            )}

            {/* Date-grouped messages */}
            {dateSections.map((section) => (
                <div key={section.date}>
                    {/* Date separator */}
                    <div className="flex justify-center my-4">
                        <span className="px-4 py-1.5 rounded-lg text-[11px] font-medium shadow-sm"
                            style={{
                                backgroundColor: "var(--wa-message-in)",
                                color: "var(--wa-text-secondary)",
                            }}>
                            {section.date}
                        </span>
                    </div>

                    {/* Messages */}
                    {section.messagesIdx.map((idx) => childrenArray[idx])}
                </div>
            ))}

            <div ref={bottomRef} />

            {/* Scroll to bottom button */}
            {showScrollDown && (
                <button
                    onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
                    className="fixed bottom-24 right-5 sm:right-10 w-10 h-10 rounded-full shadow-lg flex items-center justify-center animate-scale-in z-20 transition-all hover:scale-110"
                    style={{ backgroundColor: "var(--wa-message-in)" }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--wa-text-secondary)" strokeWidth="2.5">
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </button>
            )}
        </div>
    );
}
