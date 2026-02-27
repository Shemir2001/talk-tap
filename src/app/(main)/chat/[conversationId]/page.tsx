"use client";

import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { useMessages } from "@/hooks/useMessages";
import { useSocket } from "@/hooks/useSocket";
import { usePresence } from "@/hooks/usePresence";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import type { ConversationWithDetails, MessageWithSender } from "@/types";

export default function ConversationPage() {
    const params = useParams();
    const router = useRouter();
    const conversationId = params.conversationId as string;
    const { data: session } = useSession();
    const [conversation, setConversation] = useState<ConversationWithDetails | null>(null);
    const [replyTo, setReplyTo] = useState<MessageWithSender | null>(null);

    const { emit, on } = useSocket(session?.user?.id);
    const { messages, isLoading, hasMore, loadMore, addOptimisticMessage } = useMessages(
        conversationId,
        session?.user?.id
    );
    const { isUserOnline, getTypingUsersForConversation, startTyping, stopTyping } =
        usePresence(session?.user?.id);

    // Fetch conversation details
    useEffect(() => {
        async function fetchConversation() {
            try {
                const res = await fetch(`/api/conversations/${conversationId}`);
                if (res.ok) {
                    const data = await res.json();
                    setConversation(data.conversation);
                }
            } catch (error) {
                console.error("Fetch conversation error:", error);
            }
        }
        if (conversationId) {
            fetchConversation();
        }
    }, [conversationId]);

    // Join conversation room
    useEffect(() => {
        if (conversationId) {
            emit("joinConversation", conversationId);
        }
    }, [conversationId, emit]);

    // Mark messages as read
    useEffect(() => {
        if (!messages.length || !session?.user?.id) return;

        const unreadMessages = messages.filter(
            (m) => m.senderId !== session.user.id
        );

        if (unreadMessages.length > 0) {
            emit("markRead", {
                conversationId,
                messageIds: unreadMessages.map((m) => m.id),
            });
        }
    }, [messages, conversationId, session, emit]);

    // Send message handler
    const handleSendMessage = useCallback(
        (body: string, attachments?: { url: string; filename: string; mimeType: string; size: number }[]) => {
            if (!session?.user?.id || (!body.trim() && !attachments?.length)) return;

            // Optimistic message
            const optimisticMessage: MessageWithSender = {
                id: `temp-${Date.now()}`,
                conversationId,
                senderId: session.user.id,
                body: body.trim() || null,
                type: attachments?.length ? "IMAGE" : "TEXT",
                replyToId: replyTo?.id || null,
                forwardedFromId: null,
                isEdited: false,
                editedAt: null,
                deletedForEveryone: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                sender: {
                    id: session.user.id,
                    name: session.user.name || "You",
                    email: session.user.email || "",
                    avatar: session.user.image || null,
                    bio: null,
                    lastSeen: new Date(),
                    isOnline: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                replyTo: replyTo || null,
                attachments: attachments || [],
                reactions: [],
            };

            addOptimisticMessage(optimisticMessage);

            // Send via socket
            emit("sendMessage", {
                conversationId,
                body: body.trim(),
                type: attachments?.length ? "IMAGE" : "TEXT",
                replyToId: replyTo?.id,
                attachments,
            });

            setReplyTo(null);
        },
        [conversationId, session, replyTo, emit, addOptimisticMessage]
    );

    // Get the other user's info for 1-to-1 chats
    const otherUser = conversation?.members.find(
        (m:any) => m.userId !== session?.user?.id
    )?.user;

    const typingUsers = getTypingUsersForConversation(conversationId);

    const handleTyping = useCallback(() => {
        startTyping(conversationId, session?.user?.name || "User");
    }, [conversationId, session, startTyping]);

    const handleStopTyping = useCallback(() => {
        stopTyping(conversationId);
    }, [conversationId, stopTyping]);

    return (
        <div className="h-full flex flex-col">
            <ChatHeader
                conversation={conversation}
                otherUser={otherUser}
                isOnline={otherUser ? isUserOnline(otherUser.id) : false}
                typingUsers={typingUsers}
                onBack={() => router.push("/chat")}
            />
            <MessageList
                messages={messages}
                currentUserId={session?.user?.id || ""}
                isLoading={isLoading}
                hasMore={hasMore}
                onLoadMore={loadMore}
                onReply={(msg) => setReplyTo(msg)}
                onDelete={(messageId, forEveryone) => emit("deleteMessage", { messageId, forEveryone })}
                onEdit={(messageId, body) => emit("editMessage", { messageId, body })}
                onReact={(messageId, emoji) => emit("reactToMessage", { messageId, emoji })}
            />
            <MessageInput
                onSend={handleSendMessage}
                onTyping={handleTyping}
                onStopTyping={handleStopTyping}
                replyTo={replyTo}
                onCancelReply={() => setReplyTo(null)}
            />
        </div>
    );
}
