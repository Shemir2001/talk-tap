"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { getSocket, connectSocket, disconnectSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";

export function useSocket(userId: string | undefined) {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!userId) return;

        const socket = connectSocket(userId);
        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("Socket connected");
            setIsConnected(true);
        });

        socket.on("disconnect", () => {
            console.log("Socket disconnected");
            setIsConnected(false);
        });

        socket.on("connect_error", (err) => {
            console.error("Socket connection error:", err.message);
            setIsConnected(false);
        });

        return () => {
            disconnectSocket();
            setIsConnected(false);
        };
    }, [userId]);

    const emit = useCallback((event: string, data?: any) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit(event, data);
        }
    }, []);

    const on = useCallback((event: string, handler: (...args: any[]) => void) => {
        const socket = getSocket();
        socket.on(event, handler);
        return () => {
            socket.off(event, handler);
        };
    }, []);

    const off = useCallback((event: string, handler?: (...args: any[]) => void) => {
        const socket = getSocket();
        socket.off(event, handler);
    }, []);

    return { socket: socketRef.current, isConnected, emit, on, off };
}
