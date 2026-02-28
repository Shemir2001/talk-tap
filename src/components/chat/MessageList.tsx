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

    useEffect(() => {
        isInitialLoad.current = true;
    }, [messages.length === 0]);

    const handleScroll = () => {
        const container = containerRef.current;
        if (!container) return;
        if (container.scrollTop < 100 && hasMore && !isLoading) onLoadMore();
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

    const childrenArray = Array.isArray(children) ? children : [children];

    return (
        <div
            ref={containerRef}
            className="flex-1 overflow-y-auto px-4 sm:px-8 md:px-12 py-4 chat-bg relative"
            onScroll={handleScroll}
        >
            {isLoading && (
                <div className="flex justify-center py-4">
                    <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full typing-dot" style={{ backgroundColor: "var(--mc-primary)" }} />
                        <div className="w-2 h-2 rounded-full typing-dot" style={{ backgroundColor: "var(--mc-primary)" }} />
                        <div className="w-2 h-2 rounded-full typing-dot" style={{ backgroundColor: "var(--mc-primary)" }} />
                    </div>
                </div>
            )}

            {dateSections.map((section) => (
                <div key={section.date}>
                    <div className="flex justify-center my-4">
                        <span className="px-4 py-1.5 rounded-lg text-[11px] font-medium shadow-sm"
                            style={{
                                backgroundColor: "var(--mc-message-in)",
                                color: "var(--mc-text-secondary)",
                                boxShadow: "0 1px 3px var(--mc-shadow)",
                            }}>
                            {section.date}
                        </span>
                    </div>
                    {section.messagesIdx.map((idx) => childrenArray[idx])}
                </div>
            ))}

            <div ref={bottomRef} />

            {showScrollDown && (
                <button
                    onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
                    className="fixed bottom-24 right-[360px] md:right-[380px] w-10 h-10 rounded-full shadow-lg flex items-center justify-center animate-scale-in z-20 transition-all hover:scale-110"
                    style={{ backgroundColor: "var(--mc-message-in)", boxShadow: "0 2px 8px var(--mc-shadow)" }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mc-text-secondary)" strokeWidth="2.5">
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </button>
            )}
        </div>
    );
}
