"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { updateProfile, getCurrentUser } from "@/actions/users";
import { getInitials } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import type { SafeUser } from "@/types";

interface ProfilePanelProps {
    isDark: boolean;
    toggleDarkMode: () => void;
    notificationCount: number;
    onNotificationsClick: () => void;
}

export function ProfilePanel({
    isDark,
    toggleDarkMode,
    notificationCount,
    onNotificationsClick,
}: ProfilePanelProps) {
    const { data: session } = useSession();
    const [user, setUser] = useState<SafeUser | null>(null);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        async function loadUser() {
            const u = await getCurrentUser();
            if (u) setUser(u as SafeUser);
        }
        if (session?.user) loadUser();
    }, [session]);

    const handleAvatarUpload = useCallback(async (file: File) => {
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            if (res.ok) {
                const data = await res.json();
                const result = await updateProfile({ avatar: data.url });
                if (result.user) setUser(result.user as SafeUser);
            }
        } catch (e) {
            console.error("Avatar upload error:", e);
        } finally {
            setIsUploading(false);
        }
    }, []);

    const handleSaveField = useCallback(async (field: string) => {
        if (!editValue.trim() && field === "name") return;
        const result = await updateProfile({ [field]: editValue.trim() });
        if (result.user) setUser(result.user as SafeUser);
        setIsEditing(null);
        setEditValue("");
    }, [editValue]);

    const startEditing = (field: string, currentValue: string) => {
        setIsEditing(field);
        setEditValue(currentValue || "");
    };

    if (!user) return null;

    return (
        <div className="flex flex-col h-full dark-scrollbar" style={{ backgroundColor: "var(--mc-sidebar-left)", color: "var(--mc-text-white)" }}>
            {/* Profile Header */}
            <div className="flex flex-col items-center pt-8 pb-6 px-4">
                {/* Avatar */}
                <div className="relative mb-4">
                    <div
                        className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold text-white overflow-hidden cursor-pointer group"
                        style={{ backgroundColor: "#" + user.id.slice(0, 6) }}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                            getInitials(user.name)
                        )}
                        {/* Camera overlay */}
                        <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            {isUploading ? (
                                <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            ) : (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                    <circle cx="12" cy="13" r="4" />
                                </svg>
                            )}
                        </div>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleAvatarUpload(f);
                            e.target.value = "";
                        }}
                    />
                </div>

                {/* Name */}
                {isEditing === "name" ? (
                    <div className="flex items-center gap-2 mb-1">
                        <input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSaveField("name")}
                            className="bg-transparent border-b border-white/30 text-white text-center text-lg font-semibold outline-none px-2 py-1"
                            autoFocus
                        />
                        <button onClick={() => handleSaveField("name")} className="text-green-400 hover:text-green-300">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                        </button>
                    </div>
                ) : (
                    <h2
                        className="text-lg font-semibold cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => startEditing("name", user.name)}
                    >
                        {user.name}
                    </h2>
                )}

                {/* Bio / Status */}
                {isEditing === "bio" ? (
                    <div className="flex items-center gap-2 mt-1">
                        <input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSaveField("bio")}
                            className="bg-transparent border-b border-white/30 text-white/70 text-center text-sm outline-none px-2 py-1"
                            autoFocus
                            placeholder="Enter status"
                        />
                        <button onClick={() => handleSaveField("bio")} className="text-green-400 hover:text-green-300">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                        </button>
                    </div>
                ) : (
                    <p
                        className="text-sm mt-0.5 cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ color: "var(--mc-text-white-secondary)" }}
                        onClick={() => startEditing("bio", user.bio || "")}
                    >
                        {user.bio || "Set your status"}
                    </p>
                )}
            </div>

            {/* Profile Details */}
            <div className="flex-1 overflow-y-auto px-2">
                {/* Phone */}
                <ProfileItem
                    icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>}
                    label="Phone"
                    value={user.phone || "Add phone number"}
                    isEditing={isEditing === "phone"}
                    editValue={editValue}
                    onEdit={() => startEditing("phone", user.phone || "")}
                    onChange={setEditValue}
                    onSave={() => handleSaveField("phone")}
                />

                {/* Username */}
                <ProfileItem
                    icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M14.31 8l5.74 9.94M9.69 8h11.48M7.38 12l5.74-9.94M9.69 16L3.95 6.06M14.31 16H2.83M16.62 12l-5.74 9.94" /></svg>}
                    label="Username"
                    value={user.username ? `@${user.username}` : "Set username"}
                    isEditing={isEditing === "username"}
                    editValue={editValue}
                    onEdit={() => startEditing("username", user.username || "")}
                    onChange={setEditValue}
                    onSave={() => handleSaveField("username")}
                />

                {/* Status */}
                <ProfileItem
                    icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>}
                    label="Status"
                    value={user.bio || "Hey there! I am using WhatsApp."}
                    isEditing={false}
                    editValue=""
                    onEdit={() => startEditing("bio", user.bio || "")}
                    onChange={() => { }}
                    onSave={() => { }}
                />

                {/* Divider */}
                <div className="my-3 mx-4 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }} />

                {/* Settings Menu */}
                <MenuItem
                    icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>}
                    label="General Settings"
                />

                <MenuItem
                    icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>}
                    label="Notifications"
                    badge={notificationCount}
                    onClick={onNotificationsClick}
                />

                <MenuItem
                    icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>}
                    label="Privacy and Security"
                />

                <MenuItem
                    icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>}
                    label="Language"
                />

                {/* Dark Mode Toggle */}
                <button
                    onClick={toggleDarkMode}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors hover:bg-white/5"
                >
                    <span style={{ color: "var(--mc-text-white-secondary)" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                        </svg>
                    </span>
                    <span className="flex-1 text-left text-sm font-medium" style={{ color: "var(--mc-text-white)" }}>Dark Mode</span>
                    <div
                        className="w-10 h-5 rounded-full relative transition-colors"
                        style={{ backgroundColor: isDark ? "var(--mc-primary)" : "rgba(255,255,255,0.2)" }}
                    >
                        <div
                            className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                            style={{ left: isDark ? "22px" : "2px" }}
                        />
                    </div>
                </button>

                {/* Divider */}
                <div className="my-3 mx-4 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }} />

                {/* Logout */}
                <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors hover:bg-white/5"
                >
                    <span style={{ color: "var(--mc-danger)" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                    </span>
                    <span className="text-sm font-medium" style={{ color: "var(--mc-danger)" }}>Log out</span>
                </button>
            </div>
        </div>
    );
}

// Profile Item Component
function ProfileItem({
    icon, label, value, isEditing, editValue, onEdit, onChange, onSave,
}: {
    icon: React.ReactNode; label: string; value: string;
    isEditing: boolean; editValue: string;
    onEdit: () => void; onChange: (v: string) => void; onSave: () => void;
}) {
    return (
        <button
            onClick={onEdit}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors hover:bg-white/5 text-left"
        >
            <span style={{ color: "var(--mc-text-white-secondary)" }}>{icon}</span>
            <div className="flex-1 min-w-0">
                {isEditing ? (
                    <div className="flex items-center gap-2">
                        <input
                            value={editValue}
                            onChange={(e) => onChange(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && onSave()}
                            className="flex-1 bg-transparent border-b border-white/30 text-white text-sm outline-none py-0.5"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                        />
                        <button onClick={(e) => { e.stopPropagation(); onSave(); }} className="text-green-400">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                        </button>
                    </div>
                ) : (
                    <>
                        <p className="text-sm font-medium" style={{ color: "var(--mc-text-white)" }}>{value}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--mc-text-white-secondary)" }}>{label}</p>
                    </>
                )}
            </div>
        </button>
    );
}

// Menu Item Component
function MenuItem({
    icon, label, badge, onClick,
}: {
    icon: React.ReactNode; label: string; badge?: number; onClick?: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors hover:bg-white/5"
        >
            <span style={{ color: "var(--mc-text-white-secondary)" }}>{icon}</span>
            <span className="flex-1 text-left text-sm font-medium" style={{ color: "var(--mc-text-white)" }}>{label}</span>
            {badge !== undefined && badge > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: "var(--mc-unread)" }}>
                    {badge > 99 ? "99+" : badge}
                </span>
            )}
        </button>
    );
}
