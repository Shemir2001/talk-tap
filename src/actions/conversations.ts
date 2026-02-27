"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createConversationSchema } from "@/lib/validators";

export async function createConversation(data: {
    memberIds: string[];
    name?: string;
    isGroup?: boolean;
}) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const parsed = createConversationSchema.safeParse(data);
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    // For 1-to-1 conversations, check if one already exists
    if (!data.isGroup && data.memberIds.length === 1) {
        const existingConversation = await prisma.conversation.findFirst({
            where: {
                isGroup: false,
                AND: [
                    { members: { some: { userId: session.user.id } } },
                    { members: { some: { userId: data.memberIds[0] } } },
                ],
            },
            include: {
                members: {
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
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
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
            },
        });

        if (existingConversation) {
            return { success: true, conversation: existingConversation };
        }
    }

    const allMemberIds = [session.user.id, ...data.memberIds.filter((id) => id !== session.user.id)];

    const conversation = await prisma.conversation.create({
        data: {
            name: data.name,
            isGroup: data.isGroup || false,
            createdById: session.user.id,
            members: {
                create: allMemberIds.map((userId, index) => ({
                    userId,
                    role: index === 0 ? "ADMIN" : "MEMBER",
                })),
            },
        },
        include: {
            members: {
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
            messages: {
                orderBy: { createdAt: "desc" },
                take: 1,
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
        },
    });

    return { success: true, conversation };
}

export async function getConversations() {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const conversations = await prisma.conversation.findMany({
        where: {
            isDeleted: false,
            members: {
                some: {
                    userId: session.user.id,
                    isRemoved: false,
                },
            },
        },
        include: {
            members: {
                where: { isRemoved: false },
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
            messages: {
                orderBy: { createdAt: "desc" },
                take: 1,
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
        },
        orderBy: { lastMessageAt: "desc" },
    });

    // Attach unread counts
    const withUnread = conversations.map((conv: any) => {
        const myMembership = conv.members.find((m: any) => m.userId === session.user.id);
        return {
            ...conv,
            unreadCount: myMembership?.unreadCount || 0,
        };
    });

    return { success: true, conversations: withUnread };
}
