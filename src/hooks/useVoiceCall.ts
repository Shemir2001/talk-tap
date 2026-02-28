"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSocket } from "./useSocket";

export type CallState = "idle" | "calling" | "ringing" | "connected" | "ended";

export interface CallInfo {
    peerId: string;
    peerName: string;
    peerAvatar?: string;
    conversationId: string;
    isOutgoing: boolean;
}

const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
    ],
};

export function useVoiceCall(userId?: string) {
    const [callState, setCallState] = useState<CallState>("idle");
    const [callInfo, setCallInfo] = useState<CallInfo | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [callDuration, setCallDuration] = useState(0);

    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
    const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const iceCandidateQueueRef = useRef<RTCIceCandidate[]>([]);

    const { emit, on } = useSocket(userId);

    // Clean up function
    const cleanup = useCallback(() => {
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((t) => t.stop());
            localStreamRef.current = null;
        }
        if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
            durationIntervalRef.current = null;
        }
        iceCandidateQueueRef.current = [];
        setCallDuration(0);
        setIsMuted(false);
    }, []);

    // Start a call (outgoing)
    // callerName/callerAvatar = the caller's OWN name/avatar (shown to the callee)
    // peerId/peerName/peerAvatar = the person being called (shown to the caller)
    const startCall = useCallback(async (
        peerId: string,
        peerName: string,
        peerAvatar: string | undefined,
        conversationId: string,
        callerName: string,
        callerAvatar?: string,
    ) => {
        try {
            setCallState("calling");
            setCallInfo({ peerId, peerName, peerAvatar, conversationId, isOutgoing: true });

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;

            const pc = new RTCPeerConnection(ICE_SERVERS);
            peerConnectionRef.current = pc;

            stream.getTracks().forEach((track) => pc.addTrack(track, stream));

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    emit("ice-candidate", { to: peerId, candidate: event.candidate });
                }
            };

            pc.ontrack = (event) => {
                if (!remoteAudioRef.current) {
                    remoteAudioRef.current = new Audio();
                    remoteAudioRef.current.autoplay = true;
                }
                remoteAudioRef.current.srcObject = event.streams[0];
            };

            pc.onconnectionstatechange = () => {
                if (pc.connectionState === "connected") {
                    setCallState("connected");
                    durationIntervalRef.current = setInterval(() => {
                        setCallDuration((d) => d + 1);
                    }, 1000);
                } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
                    endCall();
                }
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            emit("call-offer", {
                to: peerId,
                offer,
                callerName,        // The CALLER's own name
                callerAvatar,      // The CALLER's own avatar
                conversationId,
            });
        } catch (err) {
            console.error("Start call error:", err);
            cleanup();
            setCallState("idle");
            setCallInfo(null);
        }
    }, [emit, cleanup]);

    // Answer an incoming call
    const answerCall = useCallback(async () => {
        if (!callInfo || callState !== "ringing") return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;

            const pc = peerConnectionRef.current;
            if (!pc) return;

            stream.getTracks().forEach((track) => pc.addTrack(track, stream));

            pc.ontrack = (event) => {
                if (!remoteAudioRef.current) {
                    remoteAudioRef.current = new Audio();
                    remoteAudioRef.current.autoplay = true;
                }
                remoteAudioRef.current.srcObject = event.streams[0];
            };

            pc.onconnectionstatechange = () => {
                if (pc.connectionState === "connected") {
                    setCallState("connected");
                    durationIntervalRef.current = setInterval(() => {
                        setCallDuration((d) => d + 1);
                    }, 1000);
                } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
                    endCall();
                }
            };

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            emit("call-answer", { to: callInfo.peerId, answer });

            // Process queued ICE candidates
            for (const candidate of iceCandidateQueueRef.current) {
                await pc.addIceCandidate(candidate);
            }
            iceCandidateQueueRef.current = [];

            setCallState("connected");
        } catch (err) {
            console.error("Answer call error:", err);
            cleanup();
            setCallState("idle");
            setCallInfo(null);
        }
    }, [callInfo, callState, emit, cleanup]);

    // End call
    const endCall = useCallback(() => {
        if (callInfo) {
            emit("call-end", { to: callInfo.peerId });
        }
        cleanup();
        setCallState("idle");
        setCallInfo(null);
    }, [callInfo, emit, cleanup]);

    // Reject incoming call
    const rejectCall = useCallback(() => {
        if (callInfo) {
            emit("call-reject", { to: callInfo.peerId });
        }
        cleanup();
        setCallState("idle");
        setCallInfo(null);
    }, [callInfo, emit, cleanup]);

    // Toggle mute
    const toggleMute = useCallback(() => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    }, []);

    // Listen for incoming call events
    useEffect(() => {
        if (!userId) return;

        const unsubOffer = on("call-offer", async (data: any) => {
            // If already in a call, auto-reject
            if (callState !== "idle") {
                emit("call-reject", { to: data.from });
                return;
            }

            setCallState("ringing");
            setCallInfo({
                peerId: data.from,
                peerName: data.callerName || "Unknown",
                peerAvatar: data.callerAvatar,
                conversationId: data.conversationId,
                isOutgoing: false,
            });

            const pc = new RTCPeerConnection(ICE_SERVERS);
            peerConnectionRef.current = pc;

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    emit("ice-candidate", { to: data.from, candidate: event.candidate });
                }
            };

            try {
                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            } catch (err) {
                console.error("Set remote description error:", err);
            }
        });

        const unsubAnswer = on("call-answer", async (data: any) => {
            const pc = peerConnectionRef.current;
            if (pc) {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                } catch (err) {
                    console.error("Set answer error:", err);
                }
            }
        });

        const unsubIce = on("ice-candidate", async (data: any) => {
            const pc = peerConnectionRef.current;
            if (pc) {
                try {
                    if (pc.remoteDescription) {
                        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                    } else {
                        iceCandidateQueueRef.current.push(new RTCIceCandidate(data.candidate));
                    }
                } catch (err) {
                    console.error("Add ICE candidate error:", err);
                }
            }
        });

        const unsubEnd = on("call-end", () => {
            cleanup();
            setCallState("idle");
            setCallInfo(null);
        });

        const unsubReject = on("call-reject", () => {
            cleanup();
            setCallState("idle");
            setCallInfo(null);
        });

        const unsubUnavailable = on("call-unavailable", () => {
            cleanup();
            setCallState("idle");
            setCallInfo(null);
        });

        return () => {
            unsubOffer();
            unsubAnswer();
            unsubIce();
            unsubEnd();
            unsubReject();
            unsubUnavailable();
        };
    }, [userId, callState, on, emit, cleanup]);

    // Format duration for display
    const formatDuration = useCallback((seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }, []);

    return {
        callState,
        callInfo,
        isMuted,
        callDuration,
        formattedDuration: formatDuration(callDuration),
        startCall,
        answerCall,
        endCall,
        rejectCall,
        toggleMute,
    };
}
