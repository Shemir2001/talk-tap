import { Conversation, Message, User, Attachment, MessageReaction, ConversationMember } from "@prisma/client";

export type SafeUser = Omit<User, "password">;

export type MessageWithSender = Message & {
    sender: SafeUser;
    replyTo?: (Message & { sender: SafeUser }) | null;
    attachments: Attachment[];
    reactions: (MessageReaction & { user: SafeUser })[];
    _count?: { reads: number };
};

export type ConversationWithDetails = Conversation & {
    members: (ConversationMember & { user: SafeUser })[];
    messages: (Message & { sender: SafeUser })[];
    _count?: { messages: number };
};

export type TypingUser = {
    userId: string;
    userName: string;
    conversationId: string;
};

export type OnlineStatus = {
    userId: string;
    isOnline: boolean;
    lastSeen?: Date;
};

export type MessageStatus = "sent" | "delivered" | "seen";

export interface NotificationData {
    id: string;
    userId: string;
    type: "MESSAGE" | "GROUP" | "SYSTEM";
    title: string;
    body: string;
    data?: Record<string, any>;
    read: boolean;
    createdAt: Date;
}

export interface SocketEvents {
    sendMessage: (data: {
        conversationId: string;
        body?: string;
        type?: string;
        replyToId?: string;
        attachments?: { url: string; filename: string; mimeType: string; size: number }[];
    }) => void;
    newMessage: (message: MessageWithSender) => void;
    typing: (data: { conversationId: string }) => void;
    stopTyping: (data: { conversationId: string }) => void;
    userTyping: (data: TypingUser) => void;
    userStopTyping: (data: TypingUser) => void;
    markRead: (data: { conversationId: string; messageIds: string[] }) => void;
    messagesRead: (data: { conversationId: string; userId: string; messageIds: string[] }) => void;
    joinConversation: (conversationId: string) => void;
    leaveConversation: (conversationId: string) => void;
    presenceUpdate: (data: OnlineStatus) => void;
    deleteMessage: (data: { messageId: string; forEveryone: boolean }) => void;
    messageDeleted: (data: { messageId: string; conversationId: string; forEveryone: boolean }) => void;
    editMessage: (data: { messageId: string; body: string }) => void;
    messageEdited: (data: { messageId: string; conversationId: string; body: string }) => void;
    reactToMessage: (data: { messageId: string; emoji: string }) => void;
    messageReaction: (data: { messageId: string; conversationId: string; userId: string; emoji: string; action: "add" | "remove" }) => void;
    conversationUpdated: (conversation: ConversationWithDetails) => void;
    notification: (data: NotificationData) => void;
}
