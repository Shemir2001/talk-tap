import { z } from "zod";

export const registerSchema = z.object({
    name: z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(50, "Name must be less than 50 characters")
        .trim(),
    email: z
        .string()
        .email("Invalid email address")
        .toLowerCase()
        .trim(),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(100, "Password must be less than 100 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number"),
});

export const loginSchema = z.object({
    email: z.string().email("Invalid email address").toLowerCase().trim(),
    password: z.string().min(1, "Password is required"),
});

export const messageSchema = z.object({
    conversationId: z.string().uuid("Invalid conversation ID"),
    body: z.string().max(5000, "Message too long").optional(),
    type: z.enum(["TEXT", "IMAGE", "FILE", "SYSTEM"]).default("TEXT"),
    replyToId: z.string().uuid().optional(),
});

export const editMessageSchema = z.object({
    messageId: z.string().uuid("Invalid message ID"),
    body: z.string().min(1, "Message cannot be empty").max(5000, "Message too long"),
});

export const createConversationSchema = z.object({
    memberIds: z.array(z.string().uuid()).min(1, "At least one member required"),
    name: z.string().max(100).optional(),
    isGroup: z.boolean().default(false),
});

export const updateProfileSchema = z.object({
    name: z.string().min(2).max(50).trim().optional(),
    bio: z.string().max(200).optional(),
    avatar: z.string().url().optional(),
});

export const searchUsersSchema = z.object({
    query: z.string().min(1).max(100).trim(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
export type EditMessageInput = z.infer<typeof editMessageSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
