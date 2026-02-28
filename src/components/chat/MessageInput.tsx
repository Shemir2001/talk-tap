"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { formatFileSize } from "@/lib/utils";
import type { MessageWithSender } from "@/types";

interface MessageInputProps {
    onSend: (body: string, attachments?: { url: string; filename: string; mimeType: string; size: number }[]) => void;
    onTyping: () => void;
    onStopTyping: () => void;
    replyTo: MessageWithSender | null;
    onCancelReply: () => void;
}

type PendingAttachment = {
    url: string;
    filename: string;
    mimeType: string;
    size: number;
    previewUrl?: string;
};

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
    const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (replyTo) inputRef.current?.focus();
    }, [replyTo]);

    const handleTyping = useCallback(() => {
        onTyping();
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(onStopTyping, 2000);
    }, [onTyping, onStopTyping]);

    const handleSend = useCallback(() => {
        if (!text.trim() && !pendingAttachment) return;
        if (pendingAttachment) {
            const { previewUrl, ...attachmentData } = pendingAttachment;
            onSend(text.trim(), [attachmentData]);
            setPendingAttachment(null);
        } else {
            onSend(text.trim());
        }
        setText("");
        setShowEmoji(false);
        onStopTyping();
        inputRef.current?.focus();
    }, [text, pendingAttachment, onSend, onStopTyping]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }, [handleSend]);

    const handleFileSelect = useCallback(async (file: File) => {
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            if (res.ok) {
                const data = await res.json();
                const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
                setPendingAttachment({ ...data, previewUrl });
            }
        } catch (error) {
            console.error("Upload error:", error);
        } finally {
            setIsUploading(false);
        }
    }, []);

    const cancelAttachment = useCallback(() => {
        if (pendingAttachment?.previewUrl) URL.revokeObjectURL(pendingAttachment.previewUrl);
        setPendingAttachment(null);
    }, [pendingAttachment]);

    // ===== Audio Recording =====
    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach((t) => t.stop());
                const blob = new Blob(chunksRef.current, { type: "audio/webm" });

                if (blob.size < 1000) return; // Too short, ignore

                // Upload the audio
                setIsUploading(true);
                try {
                    const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: "audio/webm" });
                    const formData = new FormData();
                    formData.append("file", file);
                    const res = await fetch("/api/upload", { method: "POST", body: formData });
                    if (res.ok) {
                        const data = await res.json();
                        // Send immediately as audio message
                        onSend("🎤 Voice message", [{ url: data.url, filename: data.filename, mimeType: "audio/webm", size: blob.size }]);
                    }
                } catch (err) {
                    console.error("Audio upload error:", err);
                } finally {
                    setIsUploading(false);
                }
            };

            mediaRecorder.start(250); // Collect every 250ms
            setIsRecording(true);
            setRecordingDuration(0);
            recordingTimerRef.current = setInterval(() => {
                setRecordingDuration((d) => d + 1);
            }, 1000);
        } catch (err) {
            console.error("Recording error:", err);
        }
    }, [onSend]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }
        setIsRecording(false);
        setRecordingDuration(0);
    }, []);

    const cancelRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.ondataavailable = null;
            mediaRecorderRef.current.onstop = null;
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
        }
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }
        chunksRef.current = [];
        setIsRecording(false);
        setRecordingDuration(0);
    }, []);

    const formatRecordingTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(e.target.value);
        handleTyping();
        const el = e.target;
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 120) + "px";
    };

    // If recording, show special recording UI
    if (isRecording) {
        return (
            <div style={{ backgroundColor: "var(--mc-header-bg)" }}>
                <div className="flex items-center gap-3 px-3 sm:px-4 py-3 border-t" style={{ borderColor: "var(--mc-border)" }}>
                    {/* Cancel */}
                    <button onClick={cancelRecording} className="p-2 rounded-full hover-card flex-shrink-0">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--mc-danger)" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>

                    {/* Recording indicator */}
                    <div className="flex-1 flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-sm font-medium" style={{ color: "var(--mc-danger)" }}>
                            Recording
                        </span>
                        <span className="text-sm font-mono" style={{ color: "var(--mc-text-secondary)" }}>
                            {formatRecordingTime(recordingDuration)}
                        </span>

                        {/* Audio bars */}
                        <div className="flex items-end gap-[2px] h-5">
                            {[...Array(12)].map((_, i) => (
                                <div
                                    key={i}
                                    className="w-[2px] rounded-full bg-red-400"
                                    style={{
                                        animation: `audioWaveSmall 0.8s ease-in-out ${i * 0.05}s infinite alternate`,
                                        height: `${4 + Math.random() * 16}px`,
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Send */}
                    <button onClick={stopRecording}
                        className="p-2.5 rounded-full transition-all flex-shrink-0"
                        style={{ backgroundColor: "var(--mc-primary)" }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                    </button>
                </div>

                <style>{`
                    @keyframes audioWaveSmall {
                        0% { height: 3px; }
                        100% { height: 18px; }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div style={{ backgroundColor: "var(--mc-header-bg)" }}>
            {/* Reply bar */}
            {replyTo && (
                <div className="flex items-center gap-3 px-4 py-2 border-b animate-slide-up"
                    style={{ borderColor: "var(--mc-border)" }}>
                    <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: "var(--mc-primary)" }} />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium" style={{ color: "var(--mc-primary)" }}>{replyTo.sender.name}</p>
                        <p className="text-xs truncate" style={{ color: "var(--mc-text-secondary)" }}>
                            {replyTo.body || "📎 Attachment"}
                        </p>
                    </div>
                    <button onClick={onCancelReply} className="p-1.5 rounded-full hover-card flex-shrink-0">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mc-text-secondary)" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Attachment preview */}
            {pendingAttachment && (
                <div className="flex items-center gap-3 px-4 py-3 border-b animate-slide-up"
                    style={{ borderColor: "var(--mc-border)" }}>
                    <div className="w-1 h-14 rounded-full flex-shrink-0" style={{ backgroundColor: "var(--mc-primary)" }} />
                    {pendingAttachment.previewUrl ? (
                        <img src={pendingAttachment.previewUrl} alt={pendingAttachment.filename}
                            className="w-14 h-14 rounded-xl object-cover shadow-sm" />
                    ) : (
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: "var(--mc-hover)" }}>
                            <span className="text-2xl">📄</span>
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--mc-text)" }}>{pendingAttachment.filename}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--mc-text-secondary)" }}>{formatFileSize(pendingAttachment.size)}</p>
                    </div>
                    <button onClick={cancelAttachment} className="p-1.5 rounded-full hover-card flex-shrink-0">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mc-text-secondary)" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Emoji picker */}
            {showEmoji && (
                <div className="border-b px-4 py-3 animate-slide-up" style={{ borderColor: "var(--mc-border)" }}>
                    <div className="flex flex-wrap gap-0.5">
                        {EMOJI_LIST.map((emoji) => (
                            <button key={emoji}
                                onClick={() => { setText((prev) => prev + emoji); inputRef.current?.focus(); }}
                                className="text-xl hover:scale-125 transition-transform p-1 rounded">{emoji}</button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input area */}
            <div className="flex items-end gap-2 px-3 sm:px-4 py-2.5 border-t" style={{ borderColor: "var(--mc-border)" }}>
                {/* Emoji button */}
                <button onClick={() => setShowEmoji(!showEmoji)}
                    className="p-2 rounded-full transition-colors hover-card flex-shrink-0">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--mc-text-secondary)" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                        <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" strokeLinecap="round" />
                        <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                </button>

                {/* Text input */}
                <div className="flex-1 rounded-2xl px-4 py-2.5" style={{ backgroundColor: "var(--mc-input-bg)" }}>
                    <textarea
                        ref={inputRef}
                        value={text}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        placeholder={pendingAttachment ? "Add a caption..." : "Type a message"}
                        rows={1}
                        className="w-full resize-none outline-none text-sm leading-5"
                        style={{ backgroundColor: "transparent", color: "var(--mc-text)", maxHeight: "120px" }}
                    />
                </div>

                {/* File attach */}
                <button onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-full transition-colors hover-card flex-shrink-0" disabled={isUploading}>
                    {isUploading ? (
                        <svg className="animate-spin h-[22px] w-[22px]" style={{ color: "var(--mc-text-secondary)" }} viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    ) : (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--mc-text-secondary)" strokeWidth="1.5">
                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                        </svg>
                    )}
                </button>
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx"
                    onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileSelect(file); e.target.value = ""; }} />

                {/* Mic button (when no text) or Send button (when text) */}
                {text.trim() || pendingAttachment ? (
                    <button onClick={handleSend}
                        className="p-2.5 rounded-full transition-all flex-shrink-0"
                        style={{ backgroundColor: "var(--mc-primary)" }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                    </button>
                ) : (
                    <button onClick={startRecording}
                        className="p-2.5 rounded-full transition-all flex-shrink-0 hover-card"
                        title="Record voice message">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--mc-primary)" strokeWidth="2">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
}
