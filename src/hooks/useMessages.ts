"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "./useSocket";
import type { MessageWithSender } from "@/types";

export function useMessages(
    conversationId: string | null,
    userId: string | undefined
) {
    const [messages, setMessages] = useState<MessageWithSender[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const cursorRef = useRef<string | null>(null);
    const { on, off } = useSocket(userId);

    // Fetch messages
    const fetchMessages = useCallback(
        async (cursor?: string) => {
            if (!conversationId) return;
            setIsLoading(true);

            try {
                const params = new URLSearchParams({
                    conversationId,
                    limit: "50",
                });
                if (cursor) params.set("cursor", cursor);

                const res = await fetch(`/api/messages?${params}`);
                const data = await res.json();

                if (data.messages) {
                    if (cursor) {
                        setMessages((prev) => [...data.messages, ...prev]);
                    } else {
                        setMessages(data.messages);
                    }
                    cursorRef.current = data.nextCursor;
                    setHasMore(data.hasMore);
                }
            } catch (error) {
                console.error("Fetch messages error:", error);
            } finally {
                setIsLoading(false);
            }
        },
        [conversationId]
    );

    // Load more (older messages)
    const loadMore = useCallback(() => {
        if (hasMore && !isLoading && cursorRef.current) {
            fetchMessages(cursorRef.current);
        }
    }, [hasMore, isLoading, fetchMessages]);

    // Initial fetch
    useEffect(() => {
        cursorRef.current = null;
        setMessages([]);
        setHasMore(true);
        if (conversationId) {
            fetchMessages();
        }
    }, [conversationId, fetchMessages]);

    // Listen for new messages
    useEffect(() => {
        if (!conversationId) return;

        const handleNewMessage = (message: MessageWithSender) => {
            if (message.conversationId === conversationId) {
                setMessages((prev) => {
                    // Avoid duplicates
                    if (prev.some((m) => m.id === message.id)) return prev;
                    return [...prev, message];
                });
            }
        };

        const handleMessageDeleted = (data: {
            messageId: string;
            conversationId: string;
            forEveryone: boolean;
        }) => {
            if (data.conversationId === conversationId) {
                if (data.forEveryone) {
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === data.messageId
                                ? { ...m, deletedForEveryone: true, body: null }
                                : m
                        )
                    );
                } else {
                    setMessages((prev) =>
                        prev.filter((m) => m.id !== data.messageId)
                    );
                }
            }
        };

        const handleMessageEdited = (data: {
            messageId: string;
            conversationId: string;
            body: string;
        }) => {
            if (data.conversationId === conversationId) {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === data.messageId
                            ? { ...m, body: data.body, isEdited: true }
                            : m
                    )
                );
            }
        };

        const handleMessageReaction = (data: {
            messageId: string;
            conversationId: string;
            userId: string;
            emoji: string;
            action: "add" | "remove";
        }) => {
            if (data.conversationId === conversationId) {
                setMessages((prev) =>
                    prev.map((m) => {
                        if (m.id !== data.messageId) return m;
                        if (data.action === "add") {
                            return {
                                ...m,
                                reactions: [
                                    ...m.reactions,
                                    {
                                        id: `temp-${Date.now()}`,
                                        messageId: data.messageId,
                                        userId: data.userId,
                                        emoji: data.emoji,
                                        createdAt: new Date(),
                                        user: { id: data.userId } as any,
                                    },
                                ],
                            };
                        } else {
                            return {
                                ...m,
                                reactions: m.reactions.filter(
                                    (r:any) =>
                                        !(r.userId === data.userId && r.emoji === data.emoji)
                                ),
                            };
                        }
                    })
                );
            }
        };

        const unsub1 = on("newMessage", handleNewMessage);
        const unsub2 = on("messageDeleted", handleMessageDeleted);
        const unsub3 = on("messageEdited", handleMessageEdited);
        const unsub4 = on("messageReaction", handleMessageReaction);

        return () => {
            unsub1();
            unsub2();
            unsub3();
            unsub4();
        };
    }, [conversationId, on]);

    // Add optimistic message
    const addOptimisticMessage = useCallback((message: MessageWithSender) => {
        setMessages((prev) => [...prev, message]);
    }, []);

    return {
        messages,
        isLoading,
        hasMore,
        loadMore,
        addOptimisticMessage,
        setMessages,
    };
}
