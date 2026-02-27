import { createServer } from "http";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";

const port = parseInt(process.env.SOCKET_PORT || "3001", 10);
const prisma = new PrismaClient();

// Track online users: userId -> Set<socketId>
const onlineUsers = new Map<string, Set<string>>();

const httpServer = createServer();

const io = new Server(httpServer, {
    cors: {
        origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
});

io.on("connection", async (socket) => {
    const userId = socket.handshake.auth.userId as string;

    if (!userId) {
        socket.disconnect();
        return;
    }

    console.log(`User connected: ${userId} (socket: ${socket.id})`);

    // Track online status
    if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    // Update user online status
    await prisma.user.update({
        where: { id: userId },
        data: { isOnline: true, lastSeen: new Date() },
    }).catch(() => { });

    // Join user's conversation rooms
    const memberships = await prisma.conversationMember.findMany({
        where: { userId, isRemoved: false },
        select: { conversationId: true },
    });

    for (const m of memberships) {
        socket.join(`conversation:${m.conversationId}`);
    }

    // Broadcast online status
    io.emit("presenceUpdate", { userId, isOnline: true });

    // Handle sending messages
    socket.on("sendMessage", async (data) => {
        try {
            const message = await prisma.message.create({
                data: {
                    conversationId: data.conversationId,
                    senderId: userId,
                    body: data.body,
                    type: data.type || "TEXT",
                    replyToId: data.replyToId,
                    attachments: data.attachments
                        ? {
                            create: data.attachments,
                        }
                        : undefined,
                },
                include: {
                    sender: {
                        select: {
                            id: true, name: true, email: true, avatar: true,
                            bio: true, lastSeen: true, isOnline: true,
                            createdAt: true, updatedAt: true,
                        },
                    },
                    replyTo: {
                        include: {
                            sender: {
                                select: {
                                    id: true, name: true, email: true, avatar: true,
                                    bio: true, lastSeen: true, isOnline: true,
                                    createdAt: true, updatedAt: true,
                                },
                            },
                        },
                    },
                    attachments: true,
                    reactions: {
                        include: {
                            user: {
                                select: {
                                    id: true, name: true, email: true, avatar: true,
                                    bio: true, lastSeen: true, isOnline: true,
                                    createdAt: true, updatedAt: true,
                                },
                            },
                        },
                    },
                },
            });

            // Update conversation
            await prisma.conversation.update({
                where: { id: data.conversationId },
                data: { lastMessageAt: new Date() },
            });

            // Increment unread for other members
            await prisma.conversationMember.updateMany({
                where: {
                    conversationId: data.conversationId,
                    userId: { not: userId },
                },
                data: { unreadCount: { increment: 1 } },
            });

            // Broadcast to conversation room
            io.to(`conversation:${data.conversationId}`).emit("newMessage", message);

            // Notify about conversation update
            io.to(`conversation:${data.conversationId}`).emit("conversationUpdated", {
                conversationId: data.conversationId,
            });
        } catch (error) {
            console.error("Send message error:", error);
            socket.emit("error", { message: "Failed to send message" });
        }
    });

    // Typing indicators
    socket.on("typing", (data) => {
        socket.to(`conversation:${data.conversationId}`).emit("userTyping", {
            userId,
            userName: data.userName || "User",
            conversationId: data.conversationId,
        });
    });

    socket.on("stopTyping", (data) => {
        socket.to(`conversation:${data.conversationId}`).emit("userStopTyping", {
            userId,
            userName: data.userName || "User",
            conversationId: data.conversationId,
        });
    });

    // Mark messages as read
    socket.on("markRead", async (data) => {
        try {
            if (data.messageIds?.length > 0) {
                await prisma.messageRead.createMany({
                    data: data.messageIds.map((mid: string) => ({
                        messageId: mid,
                        userId,
                    })),
                    skipDuplicates: true,
                });
            }

            // Reset unread count
            await prisma.conversationMember.update({
                where: {
                    conversationId_userId: {
                        conversationId: data.conversationId,
                        userId,
                    },
                },
                data: { unreadCount: 0 },
            });

            socket.to(`conversation:${data.conversationId}`).emit("messagesRead", {
                conversationId: data.conversationId,
                userId,
                messageIds: data.messageIds,
            });
        } catch (error) {
            console.error("Mark read error:", error);
        }
    });

    // Join a new conversation room
    socket.on("joinConversation", (conversationId) => {
        socket.join(`conversation:${conversationId}`);
    });

    // Leave conversation room
    socket.on("leaveConversation", (conversationId) => {
        socket.leave(`conversation:${conversationId}`);
    });

    // Delete message
    socket.on("deleteMessage", async (data) => {
        try {
            const message = await prisma.message.findUnique({
                where: { id: data.messageId },
            });
            if (!message) return;

            if (data.forEveryone && message.senderId === userId) {
                await prisma.message.update({
                    where: { id: data.messageId },
                    data: { deletedForEveryone: true, body: null },
                });

                io.to(`conversation:${message.conversationId}`).emit("messageDeleted", {
                    messageId: data.messageId,
                    conversationId: message.conversationId,
                    forEveryone: true,
                });
            } else {
                await prisma.messageDeletedFor.upsert({
                    where: {
                        messageId_userId: {
                            messageId: data.messageId,
                            userId,
                        },
                    },
                    update: {},
                    create: {
                        messageId: data.messageId,
                        userId,
                    },
                });

                socket.emit("messageDeleted", {
                    messageId: data.messageId,
                    conversationId: message.conversationId,
                    forEveryone: false,
                });
            }
        } catch (error) {
            console.error("Delete message error:", error);
        }
    });

    // Edit message
    socket.on("editMessage", async (data) => {
        try {
            const message = await prisma.message.findUnique({
                where: { id: data.messageId },
            });
            if (!message || message.senderId !== userId) return;

            await prisma.message.update({
                where: { id: data.messageId },
                data: { body: data.body, isEdited: true, editedAt: new Date() },
            });

            io.to(`conversation:${message.conversationId}`).emit("messageEdited", {
                messageId: data.messageId,
                conversationId: message.conversationId,
                body: data.body,
            });
        } catch (error) {
            console.error("Edit message error:", error);
        }
    });

    // React to message
    socket.on("reactToMessage", async (data) => {
        try {
            const message = await prisma.message.findUnique({
                where: { id: data.messageId },
            });
            if (!message) return;

            const existing = await prisma.messageReaction.findUnique({
                where: {
                    messageId_userId_emoji: {
                        messageId: data.messageId,
                        userId,
                        emoji: data.emoji,
                    },
                },
            });

            if (existing) {
                await prisma.messageReaction.delete({ where: { id: existing.id } });
                io.to(`conversation:${message.conversationId}`).emit("messageReaction", {
                    messageId: data.messageId,
                    conversationId: message.conversationId,
                    userId,
                    emoji: data.emoji,
                    action: "remove",
                });
            } else {
                await prisma.messageReaction.create({
                    data: { messageId: data.messageId, userId, emoji: data.emoji },
                });
                io.to(`conversation:${message.conversationId}`).emit("messageReaction", {
                    messageId: data.messageId,
                    conversationId: message.conversationId,
                    userId,
                    emoji: data.emoji,
                    action: "add",
                });
            }
        } catch (error) {
            console.error("React error:", error);
        }
    });

    // Handle disconnect
    socket.on("disconnect", async () => {
        console.log(`User disconnected: ${userId} (socket: ${socket.id})`);

        const userSockets = onlineUsers.get(userId);
        if (userSockets) {
            userSockets.delete(socket.id);
            if (userSockets.size === 0) {
                onlineUsers.delete(userId);

                // Update user status
                await prisma.user.update({
                    where: { id: userId },
                    data: { isOnline: false, lastSeen: new Date() },
                }).catch(() => { });

                io.emit("presenceUpdate", {
                    userId,
                    isOnline: false,
                    lastSeen: new Date(),
                });
            }
        }
    });
});

httpServer.listen(port, () => {
    console.log(`> Socket.IO server ready on http://localhost:${port}`);
});
