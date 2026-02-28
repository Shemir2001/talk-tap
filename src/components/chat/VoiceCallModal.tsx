"use client";

import { getInitials } from "@/lib/utils";
import type { CallState, CallInfo } from "@/hooks/useVoiceCall";

interface VoiceCallModalProps {
    callState: CallState;
    callInfo: CallInfo | null;
    isMuted: boolean;
    formattedDuration: string;
    onAnswer: () => void;
    onEnd: () => void;
    onReject: () => void;
    onToggleMute: () => void;
}

export function VoiceCallModal({
    callState,
    callInfo,
    isMuted,
    formattedDuration,
    onAnswer,
    onEnd,
    onReject,
    onToggleMute,
}: VoiceCallModalProps) {
    if (callState === "idle" || !callInfo) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "var(--mc-overlay)" }}>
            <div className="w-[340px] rounded-3xl overflow-hidden shadow-2xl animate-scale-in"
                style={{ background: "linear-gradient(180deg, #1B2838 0%, #0D1117 100%)" }}>

                {/* Caller Info */}
                <div className="flex flex-col items-center pt-10 pb-6 px-6">
                    {/* Avatar with pulse */}
                    <div className={`relative mb-6 ${callState === "ringing" || callState === "calling" ? "animate-pulse-ring" : ""}`}>
                        <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white overflow-hidden"
                            style={{ backgroundColor: "#" + (callInfo.peerId || "888").slice(0, 6) }}>
                            {callInfo.peerAvatar ? (
                                <img src={callInfo.peerAvatar} alt={callInfo.peerName} className="w-full h-full object-cover" />
                            ) : (
                                getInitials(callInfo.peerName)
                            )}
                        </div>
                        {/* Ripple effect during ringing */}
                        {(callState === "ringing" || callState === "calling") && (
                            <>
                                <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping" />
                                <div className="absolute -inset-2 rounded-full border border-white/10 animate-ping" style={{ animationDelay: "0.5s" }} />
                            </>
                        )}
                    </div>

                    <h2 className="text-xl font-semibold text-white mb-1">{callInfo.peerName}</h2>

                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                        {callState === "calling" && "Calling..."}
                        {callState === "ringing" && "Incoming call"}
                        {callState === "connected" && formattedDuration}
                        {callState === "ended" && "Call ended"}
                    </p>

                    {/* Audio wave animation during connected */}
                    {callState === "connected" && (
                        <div className="flex items-end gap-[3px] mt-4 h-6">
                            {[...Array(5)].map((_, i) => (
                                <div
                                    key={i}
                                    className="w-[3px] rounded-full"
                                    style={{
                                        backgroundColor: "var(--mc-green)",
                                        animation: `audioWave 1.2s ease-in-out ${i * 0.15}s infinite`,
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-6 pb-10 px-6">
                    {/* Mute button */}
                    {(callState === "connected" || callState === "calling") && (
                        <button
                            onClick={onToggleMute}
                            className="w-14 h-14 rounded-full flex items-center justify-center transition-all"
                            style={{ backgroundColor: isMuted ? "rgba(239, 68, 68, 0.2)" : "rgba(255,255,255,0.1)" }}
                        >
                            {isMuted ? (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                                    <line x1="1" y1="1" x2="23" y2="23" />
                                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" />
                                    <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                                </svg>
                            ) : (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                    <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                                </svg>
                            )}
                        </button>
                    )}

                    {/* Accept (incoming only) */}
                    {callState === "ringing" && (
                        <button
                            onClick={onAnswer}
                            className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-lg"
                            style={{ backgroundColor: "#10B981" }}
                        >
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                        </button>
                    )}

                    {/* End/Reject */}
                    <button
                        onClick={callState === "ringing" ? onReject : onEnd}
                        className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-lg"
                        style={{ backgroundColor: "#EF4444" }}
                    >
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
                            style={{ transform: "rotate(135deg)" }}>
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Audio wave CSS */}
            <style>{`
                @keyframes audioWave {
                    0%, 100% { height: 4px; }
                    50% { height: 20px; }
                }
            `}</style>
        </div>
    );
}
