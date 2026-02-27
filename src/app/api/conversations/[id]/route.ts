import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const conversation = await prisma.conversation.findUnique({
        where: { id },
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
    });

    if (!conversation) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Verify membership
    const isMember = conversation.members.some(
        (m:any) => m.userId === session.user.id
    );

    if (!isMember) {
        return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    return NextResponse.json({ conversation });
}
