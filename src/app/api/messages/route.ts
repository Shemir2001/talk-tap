import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!conversationId) {
        return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
    }

    // Verify membership
    const membership = await prisma.conversationMember.findUnique({
        where: {
            conversationId_userId: {
                conversationId,
                userId: session.user.id,
            },
        },
    });

    if (!membership) {
        return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    // Get messages the user hasn't deleted for themselves
    const deletedForMe = await prisma.messageDeletedFor.findMany({
        where: { userId: session.user.id },
        select: { messageId: true },
    });
    const deletedIds = deletedForMe.map((d:any) => d.messageId);

    const messages = await prisma.message.findMany({
        where: {
            conversationId,
            id: { notIn: deletedIds.length > 0 ? deletedIds : undefined },
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
            _count: {
                select: { reads: true },
            },
        },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor
            ? {
                cursor: { id: cursor },
                skip: 1,
            }
            : {}),
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return NextResponse.json({
        messages: items.reverse(),
        nextCursor,
        hasMore,
    });
}
