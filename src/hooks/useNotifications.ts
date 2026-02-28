"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "./useSocket";

export interface Notification {
    id: string;
    userId: string;
    type: "MESSAGE" | "GROUP" | "SYSTEM";
    title: string;
    body: string;
    data?: Record<string, any>;
    read: boolean;
    createdAt: string;
}

export function useNotifications(userId?: string) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const { on } = useSocket(userId);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Fetch notifications on mount
    useEffect(() => {
        if (!userId) return;

        async function fetchNotifications() {
            try {
                const res = await fetch("/api/notifications");
                if (res.ok) {
                    const data = await res.json();
                    setNotifications(data.notifications || []);
                    setUnreadCount(data.unreadCount || 0);
                }
            } catch (e) {
                console.error("Fetch notifications error:", e);
            }
        }

        fetchNotifications();
    }, [userId]);

    // Listen for real-time notifications
    useEffect(() => {
        if (!userId) return;

        const unsub = on("notification", (data: Notification) => {
            setNotifications((prev) => [data, ...prev]);
            setUnreadCount((prev) => prev + 1);

            // Play sound
            if (!audioRef.current) {
                audioRef.current = new Audio("/notification.mp3");
                audioRef.current.volume = 0.3;
            }
            audioRef.current.play().catch(() => { });

            // Browser notification
            if (Notification.permission === "granted") {
                new Notification(data.title, {
                    body: data.body,
                    icon: "/favicon.ico",
                });
            }
        });

        return unsub;
    }, [userId, on]);

    // Request browser notification permission
    useEffect(() => {
        if (typeof window !== "undefined" && "Notification" in window) {
            if (Notification.permission === "default") {
                Notification.requestPermission();
            }
        }
    }, []);

    const markAsRead = useCallback(async (notificationId?: string) => {
        try {
            await fetch("/api/notifications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "markRead",
                    notificationId,
                }),
            });

            if (notificationId) {
                setNotifications((prev) =>
                    prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
                );
                setUnreadCount((prev) => Math.max(0, prev - 1));
            } else {
                setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                setUnreadCount(0);
            }
        } catch (e) {
            console.error("Mark read error:", e);
        }
    }, []);

    return { notifications, unreadCount, markAsRead };
}
