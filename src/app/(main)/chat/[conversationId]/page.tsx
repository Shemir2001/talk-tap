"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSocket } from "@/hooks/useSocket";
import { useMessages } from "@/hooks/useMessages";
import { usePresence } from "@/hooks/usePresence";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageList } from "@/components/chat/MessageList";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { MessageInput } from "@/components/chat/MessageInput";
import type { ConversationWithDetails, MessageWithSender } from "@/types";

export default function ConversationPage() {
    const params = useParams();
    const router = useRouter();
    const conversationId = params.conversationId as string;
    const { data: session } = useSession();
    const userId = session?.user?.id;

    const [conversation, setConversation] = useState<ConversationWithDetails | null>(null);
    const [replyTo, setReplyTo] = useState<MessageWithSender | null>(null);

    const { emit } = useSocket(userId);
    const { messages, isLoading, hasMore, loadMore, addOptimisticMessage } =
        useMessages(conversationId, userId);
    const { isUserOnline, getTypingUsersForConversation, startTyping, stopTyping } =
        usePresence(userId);

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
        if (conversationId) fetchConversation();
    }, [conversationId]);

    // Join conversation room
    useEffect(() => {
        if (conversationId) {
            emit("joinConversation", conversationId);
            return () => {
                emit("leaveConversation", conversationId);
            };
        }
    }, [conversationId, emit]);

    // Mark messages as read
    useEffect(() => {
        if (messages.length > 0 && userId) {
            const unreadIds = messages
                .filter((m) => m.senderId !== userId && !m.id.startsWith("temp-"))
                .map((m) => m.id);
            if (unreadIds.length > 0) {
                emit("markRead", { conversationId, messageIds: unreadIds });
            }
        }
    }, [messages, conversationId, userId, emit]);

    const otherMember = conversation?.members.find((m: any) => m.userId !== userId);
    const isOnline = otherMember ? isUserOnline(otherMember.userId) : false;
    const typingUsers = getTypingUsersForConversation(conversationId);

    const handleSendMessage = useCallback(
        (body: string, attachments?: { url: string; filename: string; mimeType: string; size: number }[]) => {
            if (!body.trim() && !attachments?.length) return;
            if (!userId) return;

            // Determine type
            let type = "TEXT";
            if (attachments?.length) {
                const mime = attachments[0].mimeType;
                if (mime.startsWith("image/")) type = "IMAGE";
                else if (mime.startsWith("video/")) type = "VIDEO";
                else if (mime.startsWith("audio/")) type = "AUDIO";
                else type = "DOCUMENT";
            }

            // Optimistic message
            const optimisticMessage: MessageWithSender = {
                id: `temp-${Date.now()}`,
                conversationId,
                senderId: userId,
                body: body || null,
                type,
                replyToId: replyTo?.id || null,
                forwardedFromId: null,
                isEdited: false,
                editedAt: null,
                deletedForEveryone: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                sender: {
                    id: userId,
                    name: session?.user?.name || "",
                    email: session?.user?.email || "",
                    avatar: null,
                    bio: null,
                    lastSeen: new Date(),
                    isOnline: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                } as any,
                replyTo: replyTo || undefined,
                attachments: attachments?.map((a, i) => ({
                    id: `temp-att-${i}`,
                    messageId: `temp-${Date.now()}`,
                    ...a,
                    createdAt: new Date(),
                })) || [],
                reactions: [],
                _count: { reads: 0 },
            };

            addOptimisticMessage(optimisticMessage);

            // Emit via socket
            emit("sendMessage", {
                conversationId,
                body: body || "",
                type,
                replyToId: replyTo?.id,
                attachments: attachments,
            });

            setReplyTo(null);
        },
        [conversationId, userId, session, replyTo, addOptimisticMessage, emit]
    );

    const handleDelete = useCallback(
        (messageId: string, forEveryone: boolean) => {
            emit("deleteMessage", { messageId, forEveryone });
        },
        [emit]
    );

    const handleEdit = useCallback(
        (messageId: string, body: string) => {
            emit("editMessage", { messageId, body });
        },
        [emit]
    );

    const handleReact = useCallback(
        (messageId: string, emoji: string) => {
            emit("reactToMessage", { messageId, emoji });
        },
        [emit]
    );

    const handleBack = useCallback(() => {
        router.push("/chat");
    }, [router]);

    return (
        <div className="flex flex-col h-full">
            <ChatHeader
                conversation={conversation}
                currentUserId={userId || ""}
                isOnline={isOnline}
                typingUsers={typingUsers}
                onBack={handleBack}
            />

            <MessageList
                messages={messages}
                isLoading={isLoading}
                hasMore={hasMore}
                onLoadMore={loadMore}
            >
                {messages.map((message, idx) => {
                    const isOwn = message.senderId === userId;
                    const isFirst =
                        idx === 0 || messages[idx - 1].senderId !== message.senderId;

                    return (
                        <MessageBubble
                            key={message.id}
                            message={message}
                            isOwn={isOwn}
                            isFirst={isFirst}
                            currentUserId={userId || ""}
                            onReply={(m) => setReplyTo(m)}
                            onDelete={handleDelete}
                            onEdit={handleEdit}
                            onReact={handleReact}
                        />
                    );
                })}
            </MessageList>

            <MessageInput
                onSend={handleSendMessage}
                onTyping={() => startTyping(conversationId)}
                onStopTyping={() => stopTyping(conversationId)}
                replyTo={replyTo}
                onCancelReply={() => setReplyTo(null)}
            />
        </div>
    );
}
