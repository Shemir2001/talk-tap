import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (query) {
        // Search users
        const users = await prisma.user.findMany({
            where: {
                AND: [
                    { id: { not: session.user.id } },
                    {
                        OR: [
                            { name: { contains: query, mode: "insensitive" } },
                            { email: { contains: query, mode: "insensitive" } },
                        ],
                    },
                ],
            },
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
            take: 20,
        });

        return NextResponse.json({ users });
    }

    return NextResponse.json({ users: [] });
}
