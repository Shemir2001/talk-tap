"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useSocket } from "@/hooks/useSocket";
import { useMessages } from "@/hooks/useMessages";
import { usePresence } from "@/hooks/usePresence";
import { useVoiceCall } from "@/hooks/useVoiceCall";
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

    // Voice call from layout level - we use startCall here for the ChatHeader button only
    const { startCall } = useVoiceCall(userId);

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
            return () => { emit("leaveConversation", conversationId); };
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

            let type: string = "TEXT";
            if (attachments?.length) {
                const mime = attachments[0].mimeType;
                if (mime.startsWith("image/")) type = "IMAGE";
                else if (mime.startsWith("audio/")) type = "AUDIO";
                else type = "FILE";
            }

            const optimisticMessage: MessageWithSender = {
                id: `temp-${Date.now()}`,
                conversationId,
                senderId: userId,
                body: body || null,
                type: type as any,
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
                    phone: null,
                    username: null,
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

            emit("sendMessage", {
                conversationId,
                body: body || "",
                type,
                replyToId: replyTo?.id || null,
                attachments: attachments?.map((a) => ({
                    url: a.url,
                    filename: a.filename,
                    mimeType: a.mimeType,
                    size: Math.round(a.size),
                })),
            });

            setReplyTo(null);
        },
        [conversationId, userId, session, replyTo, addOptimisticMessage, emit]
    );

    const handleDelete = useCallback((messageId: string, forEveryone: boolean) => {
        emit("deleteMessage", { messageId, forEveryone });
    }, [emit]);

    const handleEdit = useCallback((messageId: string, body: string) => {
        emit("editMessage", { messageId, body });
    }, [emit]);

    const handleReact = useCallback((messageId: string, emoji: string) => {
        emit("reactToMessage", { messageId, emoji });
    }, [emit]);

    const handleBack = useCallback(() => {
        router.push("/chat");
    }, [router]);

    const handleVoiceCall = useCallback(() => {
        if (!conversation || conversation.isGroup) return;
        const other = conversation.members.find((m: any) => m.userId !== userId);
        if (other) {
            startCall(
                other.userId,                           // peerId
                other.user.name,                        // peerName (shown to caller)
                other.user.avatar || undefined,         // peerAvatar
                conversationId,                         // conversationId
                session?.user?.name || "Unknown",       // callerName (shown to callee)
                (session?.user as any)?.avatar,          // callerAvatar
            );
        }
    }, [conversation, userId, conversationId, startCall, session]);

    return (
        <div className="flex flex-col h-full">
            <ChatHeader
                conversation={conversation}
                currentUserId={userId || ""}
                isOnline={isOnline}
                typingUsers={typingUsers}
                onBack={handleBack}
                onVoiceCall={handleVoiceCall}
            />
            <MessageList messages={messages} isLoading={isLoading} hasMore={hasMore} onLoadMore={loadMore}>
                {messages.map((message, idx) => {
                    const isOwn = message.senderId === userId;
                    const isFirst = idx === 0 || messages[idx - 1].senderId !== message.senderId;
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
                onTyping={() => startTyping(conversationId, session?.user?.name || "")}
                onStopTyping={() => stopTyping(conversationId)}
                replyTo={replyTo}
                onCancelReply={() => setReplyTo(null)}
            />
        </div>
    );
}
