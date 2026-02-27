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

    return { users };
}

export async function updateProfile(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const raw = {
        name: formData.get("name") as string | undefined,
        bio: formData.get("bio") as string | undefined,
        avatar: formData.get("avatar") as string | undefined,
    };

    const parsed = updateProfileSchema.safeParse(raw);
    if (!parsed.success) return { error: parsed.error.errors[0].message };

    const updated = await prisma.user.update({
        where: { id: session.user.id },
        data: parsed.data,
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
            lastSeen: true,
            isOnline: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    return user;
}
