"use server";

import bcrypt from "bcryptjs";
import { signIn, signOut } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { registerSchema, loginSchema } from "@/lib/validators";

export async function register(formData: FormData) {
    const raw = {
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        password: formData.get("password") as string,
    };

    const parsed = registerSchema.safeParse(raw);
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message };
    }

    const { name, email, password } = parsed.data;

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        return { error: "An account with this email already exists" };
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
        },
    });

    // Auto sign in after registration
    try {
        await signIn("credentials", {
            email,
            password,
            redirect: false,
        });
        return { success: true };
    } catch {
        return { success: true, message: "Account created. Please login." };
    }
}

export async function login(formData: FormData) {
    const raw = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
    };

    const parsed = loginSchema.safeParse(raw);
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message };
    }

    try {
        await signIn("credentials", {
            email: raw.email,
            password: raw.password,
            redirect: false,
        });
        return { success: true };
    } catch {
        return { error: "Invalid email or password" };
    }
}

export async function logout() {
    await signOut({ redirect: false });
    return { success: true };
}
