"use client";

import { useState, useRef } from "react";
import { formatTime, getInitials, formatFileSize } from "@/lib/utils";
import type { MessageWithSender } from "@/types";

interface MessageBubbleProps {
    message: MessageWithSender;
    isOwn: boolean;
    isFirst: boolean;
    currentUserId: string;
    onReply: (message: MessageWithSender) => void;
    onDelete: (messageId: string, forEveryone: boolean) => void;
    onEdit: (messageId: string, body: string) => void;
    onReact: (messageId: string, emoji: string) => void;
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export function MessageBubble({
    message,
    isOwn,
    isFirst,
    currentUserId,
    onReply,
    onDelete,
    onEdit,
    onReact,
}: MessageBubbleProps) {
    const [showActions, setShowActions] = useState(false);
    const [showReactions, setShowReactions] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(message.body || "");
    const actionsRef = useRef<HTMLDivElement>(null);

    // Deleted for everyone
    if (message.deletedForEveryone) {
        return (
            <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-0.5`}>
                <div
                    className="max-w-[65%] px-3 py-2 rounded-lg italic text-xs"
                    style={{
                        backgroundColor: isOwn ? "var(--wa-message-out)" : "var(--wa-message-in)",
                        color: "var(--wa-text-secondary)",
                    }}
                >
                    🚫 This message was deleted
                </div>
            </div>
        );
    }

    const handleEditSave = () => {
        if (editText.trim() && editText !== message.body) {
            onEdit(message.id, editText.trim());
        }
        setIsEditing(false);
    };

    // Group reactions by emoji
    const reactionGroups: { emoji: string; count: number; hasOwn: boolean }[] = [];
    message.reactions?.forEach((r: any) => {
        const existing = reactionGroups.find((g) => g.emoji === r.emoji);
        if (existing) {
            existing.count++;
            if (r.userId === currentUserId) existing.hasOwn = true;
        } else {
            reactionGroups.push({
                emoji: r.emoji,
                count: 1,
                hasOwn: r.userId === currentUserId,
            });
        }
    });

    return (
        <div
            className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-0.5 group relative`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => {
                setShowActions(false);
                setShowReactions(false);
            }}
        >
            <div
                className={`relative max-w-[65%] px-2 pt-1.5 pb-1 rounded-lg shadow-sm ${isFirst ? (isOwn ? "message-tail-out" : "message-tail-in") : ""
                    }`}
                style={{
                    backgroundColor: isOwn ? "var(--wa-message-out)" : "var(--wa-message-in)",
                    borderTopRightRadius: isOwn && isFirst ? 0 : undefined,
                    borderTopLeftRadius: !isOwn && isFirst ? 0 : undefined,
                }}
            >
                {/* Forwarded label */}
                {message.forwardedFromId && (
                    <div className="flex items-center gap-1 mb-1 text-xs italic" style={{ color: "var(--wa-text-secondary)" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="15 17 20 12 15 7" /><path d="M4 18v-2a4 4 0 0 1 4-4h12" />
                        </svg>
                        Forwarded
                    </div>
                )}

                {/* Reply quote */}
                {message.replyTo && (
                    <div
                        className="mb-1 px-2 py-1.5 rounded border-l-4 text-xs cursor-pointer"
                        style={{
                            backgroundColor: isOwn ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.03)",
                            borderColor: "var(--wa-green)",
                        }}
                    >
                        <p className="font-medium text-[11px]" style={{ color: "var(--wa-green)" }}>
                            {message.replyTo.sender.name}
                        </p>
                        <p className="truncate" style={{ color: "var(--wa-text-secondary)" }}>
                            {message.replyTo.body || "📎 Attachment"}
                        </p>
                    </div>
                )}

                {/* Sender name (for group chats) */}
                {!isOwn && isFirst && message.sender && (
                    <p className="text-xs font-medium mb-0.5" style={{ color: "#" + message.senderId.slice(0, 6) }}>
                        {message.sender.name}
                    </p>
                )}

                {/* Attachments */}
                {message.attachments?.length > 0 && (
                    <div className="mb-1">
                        {message.attachments.map((att: any) => (
                            <div key={att.id} className="mb-1">
                                {att.mimeType.startsWith("image/") ? (
                                    <img
                                        src={att.url}
                                        alt={att.filename}
                                        className="rounded-lg max-w-full max-h-[300px] object-cover"
                                        loading="lazy"
                                    />
                                ) : (
                                    <a
                                        href={att.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-2 rounded-lg"
                                        style={{ backgroundColor: "rgba(0,0,0,0.05)" }}
                                    >
                                        <span className="text-2xl">📄</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium truncate" style={{ color: "var(--wa-text)" }}>
                                                {att.filename}
                                            </p>
                                            <p className="text-[10px]" style={{ color: "var(--wa-text-secondary)" }}>
                                                {formatFileSize(att.size)}
                                            </p>
                                        </div>
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Message body */}
                {isEditing ? (
                    <div className="flex items-center gap-1">
                        <input
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleEditSave()}
                            className="flex-1 px-2 py-1 text-sm rounded outline-none"
                            style={{ backgroundColor: "rgba(0,0,0,0.05)", color: "var(--wa-text)" }}
                            autoFocus
                        />
                        <button onClick={handleEditSave} className="text-xs px-2 py-1 rounded" style={{ color: "var(--wa-green)" }}>
                            ✓
                        </button>
                        <button onClick={() => setIsEditing(false)} className="text-xs px-2 py-1 rounded" style={{ color: "var(--wa-danger)" }}>
                            ✕
                        </button>
                    </div>
                ) : (
                    <div className="flex items-end gap-2">
                        {message.body && (
                            <p className="text-sm whitespace-pre-wrap break-words" style={{ color: "var(--wa-text)" }}>
                                {message.body}
                            </p>
                        )}
                        <span className="flex items-center gap-0.5 flex-shrink-0 pb-0.5 ml-auto">
                            {message.isEdited && (
                                <span className="text-[10px] italic" style={{ color: "var(--wa-text-secondary)" }}>
                                    edited
                                </span>
                            )}
                            <span className="text-[10px] leading-none whitespace-nowrap" style={{ color: "var(--wa-text-secondary)" }}>
                                {formatTime(message.createdAt)}
                            </span>
                            {isOwn && (
                                (() => {
                                    const isSending = message.id.startsWith("temp-");
                                    const readCount = message._count?.reads || 0;
                                    const isSeen = readCount > 0;

                                    if (isSending) {
                                        // Clock icon - sending
                                        return (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="ml-0.5">
                                                <circle cx="12" cy="12" r="9" stroke="var(--wa-text-secondary)" strokeWidth="1.5" />
                                                <path d="M12 7v5l3 3" stroke="var(--wa-text-secondary)" strokeWidth="1.5" strokeLinecap="round" />
                                            </svg>
                                        );
                                    }

                                    if (isSeen) {
                                        // Double blue tick - seen
                                        return (
                                            <svg width="16" height="11" viewBox="0 0 16 11" className="ml-0.5">
                                                <path
                                                    d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.36-.186.465.465 0 0 0-.344.153l-.311.341a.514.514 0 0 0-.14.358c0 .143.057.269.14.358l2.7 2.813c.098.098.219.163.36.163a.527.527 0 0 0 .39-.175l6.835-8.434a.49.49 0 0 0 .123-.34.477.477 0 0 0-.14-.333z"
                                                    fill="var(--wa-blue)"
                                                />
                                                <path
                                                    d="M15.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-1.2-1.25-.313.344 1.865 1.943c.098.098.219.163.36.163a.527.527 0 0 0 .39-.175l6.835-8.434a.49.49 0 0 0 .123-.34.477.477 0 0 0-.14-.333z"
                                                    fill="var(--wa-blue)"
                                                />
                                            </svg>
                                        );
                                    }

                                    // Single grey tick - sent but not read
                                    return (
                                        <svg width="12" height="11" viewBox="0 0 12 11" className="ml-0.5">
                                            <path
                                                d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.36-.186.465.465 0 0 0-.344.153l-.311.341a.514.514 0 0 0-.14.358c0 .143.057.269.14.358l2.7 2.813c.098.098.219.163.36.163a.527.527 0 0 0 .39-.175l6.835-8.434a.49.49 0 0 0 .123-.34.477.477 0 0 0-.14-.333z"
                                                fill="var(--wa-text-secondary)"
                                            />
                                        </svg>
                                    );
                                })()
                            )}
                        </span>
                    </div>
                )}

                {/* Reactions */}
                {reactionGroups.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1 -mb-2">
                        {reactionGroups.map((r) => (
                            <button
                                key={r.emoji}
                                onClick={() => onReact(message.id, r.emoji)}
                                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border ${r.hasOwn ? "border-blue-300" : ""
                                    }`}
                                style={{
                                    backgroundColor: r.hasOwn ? "rgba(83, 189, 235, 0.15)" : "rgba(0,0,0,0.04)",
                                    borderColor: r.hasOwn ? "var(--wa-blue)" : "transparent",
                                }}
                            >
                                <span>{r.emoji}</span>
                                {r.count > 1 && (
                                    <span className="text-[10px]" style={{ color: "var(--wa-text-secondary)" }}>
                                        {r.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Action buttons (on hover) */}
            {showActions && !isEditing && (
                <div
                    ref={actionsRef}
                    className={`absolute top-0 ${isOwn ? "left-0 -translate-x-full" : "right-0 translate-x-full"} flex items-start z-10`}
                >
                    <div
                        className="flex items-center gap-0.5 rounded-lg shadow-md px-1 py-0.5 mx-1 animate-scale-in"
                        style={{ backgroundColor: "var(--wa-message-in)" }}
                    >
                        {/* React */}
                        <button
                            onClick={() => setShowReactions(!showReactions)}
                            className="p-1.5 rounded hover:bg-black/5 transition-colors text-sm"
                            title="React"
                        >
                            😊
                        </button>
                        {/* Reply */}
                        <button
                            onClick={() => onReply(message)}
                            className="p-1.5 rounded hover:bg-black/5 transition-colors"
                            title="Reply"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--wa-text-secondary)" strokeWidth="2">
                                <polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                            </svg>
                        </button>
                        {/* Edit (own only) */}
                        {isOwn && message.body && (
                            <button
                                onClick={() => {
                                    setIsEditing(true);
                                    setEditText(message.body || "");
                                    setShowActions(false);
                                }}
                                className="p-1.5 rounded hover:bg-black/5 transition-colors"
                                title="Edit"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--wa-text-secondary)" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                            </button>
                        )}
                        {/* Delete */}
                        <button
                            onClick={() => onDelete(message.id, isOwn)}
                            className="p-1.5 rounded hover:bg-black/5 transition-colors"
                            title={isOwn ? "Delete for everyone" : "Delete for me"}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--wa-danger)" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                        </button>
                    </div>

                    {/* Quick reactions popup */}
                    {showReactions && (
                        <div
                            className="absolute top-8 rounded-full shadow-lg px-2 py-1 flex gap-1 animate-scale-in"
                            style={{
                                backgroundColor: "var(--wa-message-in)",
                                [isOwn ? "right" : "left"]: 0,
                            }}
                        >
                            {QUICK_REACTIONS.map((emoji) => (
                                <button
                                    key={emoji}
                                    onClick={() => {
                                        onReact(message.id, emoji);
                                        setShowReactions(false);
                                    }}
                                    className="text-lg hover:scale-125 transition-transform p-0.5"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
