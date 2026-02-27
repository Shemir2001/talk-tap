"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
    if (!socket) {
        socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000", {
            autoConnect: false,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 10000,
        });
    }
    return socket;
}

export function connectSocket(userId: string): Socket {
    const s = getSocket();
    if (!s.connected) {
        s.auth = { userId };
        s.connect();
    }
    return s;
}

export function disconnectSocket(): void {
    if (socket?.connected) {
        socket.disconnect();
    }
}
