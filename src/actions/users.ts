"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { updateProfileSchema } from "@/lib/validators";

export async function searchUsers(query: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    if (!query || query.length < 1) return { users: [] };

    const users = await prisma.user.findMany({
        where: {
            AND: [
                { id: { not: session.user.id } },
                {
                    OR: [
                        { name: { contains: query, mode: "insensitive" } },
                        { email: { contains: query, mode: "insensitive" } },
                        { username: { contains: query, mode: "insensitive" } },
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
            phone: true,
            username: true,
            lastSeen: true,
            isOnline: true,
            createdAt: true,
            updatedAt: true,
        },
        take: 20,
    });

    return { users };
}

export async function updateProfile(data: {
    name?: string;
    bio?: string;
    avatar?: string;
    phone?: string;
    username?: string;
}) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const parsed = updateProfileSchema.safeParse(data);
    if (!parsed.success) return { error: parsed.error.errors[0].message };

    // Check username uniqueness
    if (parsed.data.username) {
        const existing = await prisma.user.findFirst({
            where: {
                username: parsed.data.username,
                id: { not: session.user.id },
            },
        });
        if (existing) return { error: "Username already taken" };
    }

    // Build update data, only include non-empty values
    const updateData: Record<string, any> = {};
    if (parsed.data.name) updateData.name = parsed.data.name;
    if (parsed.data.bio !== undefined) updateData.bio = parsed.data.bio;
    if (parsed.data.avatar !== undefined) updateData.avatar = parsed.data.avatar || null;
    if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone || null;
    if (parsed.data.username !== undefined) updateData.username = parsed.data.username || null;

    const updated = await prisma.user.update({
        where: { id: session.user.id },
        data: updateData,
        select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            bio: true,
            phone: true,
            username: true,
            lastSeen: true,
            isOnline: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    return { success: true, user: updated };
}

export async function getCurrentUser() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            bio: true,
            phone: true,
            username: true,
            lastSeen: true,
            isOnline: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    return user;
}
