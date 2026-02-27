"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { MessageWithSender } from "@/types";

interface MessageInputProps {
    onSend: (body: string, attachments?: { url: string; filename: string; mimeType: string; size: number }[]) => void;
    onTyping: () => void;
    onStopTyping: () => void;
    replyTo: MessageWithSender | null;
    onCancelReply: () => void;
}

const EMOJI_LIST = ["😀", "😂", "🥹", "😍", "🤩", "😎", "🥳", "😤", "🤔", "🤗", "😴", "🙄", "😬", "🤮", "👿", "💀", "👻", "👽", "🤖", "💩", "👍", "👎", "👏", "🙏", "💪", "❤️", "🔥", "⭐", "💯", "🎉", "🎊", "🏆", "🌟", "💫", "✨", "⚡", "🌈", "☀️", "🌙", "🌸", "🍕", "🍔", "☕", "🎵", "📷", "💻", "📱", "✈️"];

export function MessageInput({
    onSend,
    onTyping,
    onStopTyping,
    replyTo,
    onCancelReply,
}: MessageInputProps) {
    const [text, setText] = useState("");
    const [showEmoji, setShowEmoji] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Auto-focus on reply
    useEffect(() => {
        if (replyTo) {
            inputRef.current?.focus();
        }
    }, [replyTo]);

    const handleTyping = useCallback(() => {
        onTyping();
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(onStopTyping, 2000);
    }, [onTyping, onStopTyping]);

    const handleSend = useCallback(() => {
        if (!text.trim() && !isUploading) return;
        onSend(text.trim());
        setText("");
        setShowEmoji(false);
        onStopTyping();
        inputRef.current?.focus();
    }, [text, isUploading, onSend, onStopTyping]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        },
        [handleSend]
    );

    const handleFileUpload = useCallback(
        async (file: File) => {
            setIsUploading(true);
            try {
                const formData = new FormData();
                formData.append("file", file);

                const res = await fetch("/api/upload", {
                    method: "POST",
                    body: formData,
                });

                if (res.ok) {
                    const data = await res.json();
                    onSend("", [data]);
                }
            } catch (error) {
                console.error("Upload error:", error);
            } finally {
                setIsUploading(false);
            }
        },
        [onSend]
    );

    // Auto-resize textarea
    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(e.target.value);
        handleTyping();
        const el = e.target;
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 120) + "px";
    };

    return (
        <div style={{ backgroundColor: "var(--wa-header-bg)" }}>
            {/* Reply bar */}
            {replyTo && (
                <div
                    className="flex items-center gap-3 px-4 py-2 border-b animate-fade-in"
                    style={{ borderColor: "var(--wa-border)" }}
                >
                    <div className="w-1 h-10 rounded-full" style={{ backgroundColor: "var(--wa-green)" }} />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium" style={{ color: "var(--wa-green)" }}>
                            {replyTo.sender.name}
                        </p>
                        <p className="text-xs truncate" style={{ color: "var(--wa-text-secondary)" }}>
                            {replyTo.body || "📎 Attachment"}
                        </p>
                    </div>
                    <button onClick={onCancelReply} className="p-1">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--wa-text-secondary)" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Emoji picker */}
            {showEmoji && (
                <div
                    className="border-b px-4 py-3 animate-fade-in"
                    style={{ borderColor: "var(--wa-border)" }}
                >
                    <div className="flex flex-wrap gap-1">
                        {EMOJI_LIST.map((emoji) => (
                            <button
                                key={emoji}
                                onClick={() => {
                                    setText((prev) => prev + emoji);
                                    inputRef.current?.focus();
                                }}
                                className="text-xl hover:scale-125 transition-transform p-1"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input area */}
            <div className="flex items-end gap-2 px-4 py-3">
                {/* Emoji button */}
                <button
                    onClick={() => setShowEmoji(!showEmoji)}
                    className="p-2 rounded-full hover:bg-black/5 transition-colors flex-shrink-0"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--wa-text-secondary)" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                        <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" strokeLinecap="round" />
                        <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                </button>

                {/* File attach */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-full hover:bg-black/5 transition-colors flex-shrink-0"
                    disabled={isUploading}
                >
                    {isUploading ? (
                        <svg className="animate-spin h-6 w-6" style={{ color: "var(--wa-text-secondary)" }} viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--wa-text-secondary)" strokeWidth="1.5">
                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                        </svg>
                    )}
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                        e.target.value = "";
                    }}
                />

                {/* Text input */}
                <div className="flex-1 rounded-lg px-3 py-2" style={{ backgroundColor: "var(--wa-input-bg)" }}>
                    <textarea
                        ref={inputRef}
                        value={text}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message"
                        rows={1}
                        className="w-full resize-none outline-none text-sm leading-5"
                        style={{
                            backgroundColor: "transparent",
                            color: "var(--wa-text)",
                            maxHeight: "120px",
                        }}
                    />
                </div>

                {/* Send button */}
                <button
                    onClick={handleSend}
                    disabled={!text.trim() && !isUploading}
                    className="p-2 rounded-full transition-colors flex-shrink-0 disabled:opacity-30"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--wa-text-secondary)">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
