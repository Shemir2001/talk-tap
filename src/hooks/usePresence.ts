"use client";

import { useState, useEffect, useCallback } from "react";
import { useSocket } from "./useSocket";

export function usePresence(userId: string | undefined) {
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [typingUsers, setTypingUsers] = useState<
        Map<string, { userId: string; userName: string }>
    >(new Map());
    const { on, emit } = useSocket(userId);

    useEffect(() => {
        if (!userId) return;

        const handlePresence = (data: {
            userId: string;
            isOnline: boolean;
        }) => {
            setOnlineUsers((prev) => {
                const next = new Set(prev);
                if (data.isOnline) {
                    next.add(data.userId);
                } else {
                    next.delete(data.userId);
                }
                return next;
            });
        };

        const handleTyping = (data: {
            userId: string;
            userName: string;
            conversationId: string;
        }) => {
            setTypingUsers((prev) => {
                const next = new Map(prev);
                next.set(`${data.conversationId}:${data.userId}`, {
                    userId: data.userId,
                    userName: data.userName,
                });
                return next;
            });

            // Auto-remove after 3 seconds
            setTimeout(() => {
                setTypingUsers((prev) => {
                    const next = new Map(prev);
                    next.delete(`${data.conversationId}:${data.userId}`);
                    return next;
                });
            }, 3000);
        };

        const handleStopTyping = (data: {
            userId: string;
            conversationId: string;
        }) => {
            setTypingUsers((prev) => {
                const next = new Map(prev);
                next.delete(`${data.conversationId}:${data.userId}`);
                return next;
            });
        };

        const unsub1 = on("presenceUpdate", handlePresence);
        const unsub2 = on("userTyping", handleTyping);
        const unsub3 = on("userStopTyping", handleStopTyping);

        return () => {
            unsub1();
            unsub2();
            unsub3();
        };
    }, [userId, on]);

    const isUserOnline = useCallback(
        (uid: string) => onlineUsers.has(uid),
        [onlineUsers]
    );

    const getTypingUsersForConversation = useCallback(
        (conversationId: string) => {
            const typing: { userId: string; userName: string }[] = [];
            typingUsers.forEach((value, key) => {
                if (key.startsWith(`${conversationId}:`)) {
                    typing.push(value);
                }
            });
            return typing;
        },
        [typingUsers]
    );

    const startTyping = useCallback(
        (conversationId: string, userName: string) => {
            emit("typing", { conversationId, userName });
        },
        [emit]
    );

    const stopTyping = useCallback(
        (conversationId: string) => {
            emit("stopTyping", { conversationId });
        },
        [emit]
    );

    return {
        onlineUsers,
        isUserOnline,
        getTypingUsersForConversation,
        startTyping,
        stopTyping,
    };
}
