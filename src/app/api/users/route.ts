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

    const users = await prisma.user.findMany({
        where: {
            AND: [
                { id: { not: session.user.id } },
                ...(query
                    ? [
                        {
                            OR: [
                                { name: { contains: query, mode: "insensitive" as const } },
                                { email: { contains: query, mode: "insensitive" as const } },
                            ],
                        },
                    ]
                    : []),
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
        take: 50,
        orderBy: { name: "asc" },
    });

    return NextResponse.json({ users });
}
