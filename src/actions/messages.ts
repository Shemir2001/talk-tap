"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { messageSchema, editMessageSchema } from "@/lib/validators";

export async function sendMessage(data: {
    conversationId: string;
    body?: string;
    type?: "TEXT" | "IMAGE" | "FILE" | "SYSTEM";
    replyToId?: string;
    forwardedFromId?: string;
    attachments?: { url: string; filename: string; mimeType: string; size: number }[];
}) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const parsed = messageSchema.safeParse(data);
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    // Verify user is a member of this conversation
    const membership = await prisma.conversationMember.findUnique({
        where: {
            conversationId_userId: {
                conversationId: data.conversationId,
                userId: session.user.id,
            },
        },
    });

    if (!membership) return { error: "Not a member of this conversation" };

    const message = await prisma.message.create({
        data: {
            conversationId: data.conversationId,
            senderId: session.user.id,
            body: data.body,
            type: data.type || "TEXT",
            replyToId: data.replyToId,
            forwardedFromId: data.forwardedFromId,
            attachments: data.attachments
                ? {
                    create: data.attachments.map((a) => ({
                        url: a.url,
                        filename: a.filename,
                        mimeType: a.mimeType,
                        size: a.size,
                    })),
                }
                : undefined,
        },
        include: {
            sender: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true,
                    bio: true,
                    lastSeen: true,
                    isOnline: true,
                    createdAt: true,
                    updatedAt: true,
                },
            },
            replyTo: {
                include: {
                    sender: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            avatar: true,
                            bio: true,
                            lastSeen: true,
                            isOnline: true,
                            createdAt: true,
                            updatedAt: true,
                        },
                    },
                },
            },
            attachments: true,
            reactions: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            avatar: true,
                            bio: true,
                            lastSeen: true,
                            isOnline: true,
                            createdAt: true,
                            updatedAt: true,
                        },
                    },
                },
            },
        },
    });

    // Update conversation lastMessageAt
    await prisma.conversation.update({
        where: { id: data.conversationId },
        data: { lastMessageAt: new Date() },
    });

    // Increment unread count for other members
    await prisma.conversationMember.updateMany({
        where: {
            conversationId: data.conversationId,
            userId: { not: session.user.id },
        },
        data: {
            unreadCount: { increment: 1 },
        },
    });

    return { success: true, message };
}

export async function editMessage(data: { messageId: string; body: string }) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const parsed = editMessageSchema.safeParse(data);
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const message = await prisma.message.findUnique({
        where: { id: data.messageId },
    });

    if (!message) return { error: "Message not found" };
    if (message.senderId !== session.user.id) return { error: "Not authorized" };

    const updated = await prisma.message.update({
        where: { id: data.messageId },
        data: {
            body: data.body,
            isEdited: true,
            editedAt: new Date(),
        },
    });

    return { success: true, message: updated };
}

export async function deleteMessage(data: { messageId: string; forEveryone: boolean }) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const message = await prisma.message.findUnique({
        where: { id: data.messageId },
    });

    if (!message) return { error: "Message not found" };

    if (data.forEveryone) {
        if (message.senderId !== session.user.id) return { error: "Not authorized" };

        await prisma.message.update({
            where: { id: data.messageId },
            data: { deletedForEveryone: true, body: null },
        });
    } else {
        await prisma.messageDeletedFor.upsert({
            where: {
                messageId_userId: {
                    messageId: data.messageId,
                    userId: session.user.id,
                },
            },
            update: {},
            create: {
                messageId: data.messageId,
                userId: session.user.id,
            },
        });
    }

    return { success: true };
}

export async function forwardMessage(data: {
    messageId: string;
    conversationIds: string[];
}) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const original = await prisma.message.findUnique({
        where: { id: data.messageId },
        include: { attachments: true },
    });

    if (!original) return { error: "Message not found" };

    const messages = await Promise.all(
        data.conversationIds.map((convId) =>
            prisma.message.create({
                data: {
                    conversationId: convId,
                    senderId: session.user.id,
                    body: original.body,
                    type: original.type,
                    forwardedFromId: original.id,
                    attachments: {
                        create: original.attachments.map((a:any) => ({
                            url: a.url,
                            filename: a.filename,
                            mimeType: a.mimeType,
                            size: a.size,
                        })),
                    },
                },
            })
        )
    );

    return { success: true, messages };
}

export async function addReaction(data: { messageId: string; emoji: string }) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const existing = await prisma.messageReaction.findUnique({
        where: {
            messageId_userId_emoji: {
                messageId: data.messageId,
                userId: session.user.id,
                emoji: data.emoji,
            },
        },
    });

    if (existing) {
        await prisma.messageReaction.delete({
            where: { id: existing.id },
        });
        return { success: true, action: "removed" as const };
    }

    await prisma.messageReaction.create({
        data: {
            messageId: data.messageId,
            userId: session.user.id,
            emoji: data.emoji,
        },
    });

    return { success: true, action: "added" as const };
}

export async function markMessagesAsRead(data: {
    conversationId: string;
    messageIds: string[];
}) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    // Create read receipts for all messages
    await prisma.messageRead.createMany({
        data: data.messageIds.map((mid) => ({
            messageId: mid,
            userId: session.user.id,
        })),
        skipDuplicates: true,
    });

    // Reset unread count
    await prisma.conversationMember.update({
        where: {
            conversationId_userId: {
                conversationId: data.conversationId,
                userId: session.user.id,
            },
        },
        data: { unreadCount: 0 },
    });

    return { success: true };
}
