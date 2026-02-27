"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { searchUsers } from "@/actions/users";
import { createConversation } from "@/actions/conversations";
import { formatTime, formatLastSeen, getInitials, truncate } from "@/lib/utils";
import type { ConversationWithDetails, SafeUser } from "@/types";

interface SidebarProps {
    conversations: (ConversationWithDetails & { unreadCount: number })[];
    selectedConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onConversationCreated: () => void;
    isUserOnline: (userId: string) => boolean;
    currentUserId: string;
    isDark: boolean;
    toggleDarkMode: () => void;
}

export function Sidebar({
    conversations,
    selectedConversationId,
    onSelectConversation,
    onConversationCreated,
    isUserOnline,
    currentUserId,
    isDark,
    toggleDarkMode,
}: SidebarProps) {
    const { data: session } = useSession();
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SafeUser[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [showNewGroup, setShowNewGroup] = useState(false);
    const [selectedMembers, setSelectedMembers] = useState<SafeUser[]>([]);
    const [groupName, setGroupName] = useState("");
    const [allUsers, setAllUsers] = useState<SafeUser[]>([]);
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

    // Fetch all users on mount to show in sidebar
    useEffect(() => {
        async function fetchAllUsers() {
            try {
                const res = await fetch("/api/users?q=");
                if (res.ok) {
                    const data = await res.json();
                    setAllUsers((data.users || []).filter((u: SafeUser) => u.id !== currentUserId));
                }
            } catch (e) {
                console.error("Fetch users error:", e);
            }
        }
        if (currentUserId) fetchAllUsers();
    }, [currentUserId]);

    const handleSearch = useCallback(
        async (query: string) => {
            setSearchQuery(query);
            if (searchTimeout.current) clearTimeout(searchTimeout.current);

            if (!query.trim()) {
                setSearchResults([]);
                return;
            }

            searchTimeout.current = setTimeout(async () => {
                setIsSearching(true);
                const result = await searchUsers(query);
                if (result.users) {
                    setSearchResults(result.users as SafeUser[]);
                }
                setIsSearching(false);
            }, 300);
        },
        []
    );

    const handleStartConversation = useCallback(
        async (userId: string) => {
            const result = await createConversation({
                memberIds: [userId],
                isGroup: false,
            });

            if (result.conversation) {
                setShowSearch(false);
                setSearchQuery("");
                setSearchResults([]);
                onConversationCreated();
                onSelectConversation(result.conversation.id);
            }
        },
        [onConversationCreated, onSelectConversation]
    );

    const handleCreateGroup = useCallback(async () => {
        if (selectedMembers.length === 0 || !groupName.trim()) return;

        const result = await createConversation({
            memberIds: selectedMembers.map((m) => m.id),
            name: groupName,
            isGroup: true,
        });

        if (result.conversation) {
            setShowNewGroup(false);
            setSelectedMembers([]);
            setGroupName("");
            onConversationCreated();
            onSelectConversation(result.conversation.id);
        }
    }, [selectedMembers, groupName, onConversationCreated, onSelectConversation]);

    const getConversationName = (conv: ConversationWithDetails) => {
        if (conv.isGroup) return conv.name || "Group";
        const otherMember = conv.members.find((m: any) => m.userId !== currentUserId);
        return otherMember?.user.name || "Unknown";
    };

    const getConversationAvatar = (conv: ConversationWithDetails) => {
        if (conv.isGroup) return null;
        const otherMember = conv.members.find((m: any) => m.userId !== currentUserId);
        return otherMember?.user;
    };

    const isConversationOnline = (conv: ConversationWithDetails) => {
        if (conv.isGroup) return false;
        const otherMember = conv.members.find((m: any) => m.userId !== currentUserId);
        return otherMember ? isUserOnline(otherMember.userId) : false;
    };

    // Render a user card
    const renderUserCard = (user: SafeUser, onClick: () => void, showCheckbox = false, isSelected = false) => (
        <button
            key={user.id}
            onClick={onClick}
            className="w-full flex items-center gap-3 px-4 py-3 hover-card"
            style={{ backgroundColor: isSelected ? "var(--wa-hover)" : undefined }}
        >
            <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold text-white shadow-sm"
                    style={{ backgroundColor: "#" + user.id.slice(0, 6) }}>
                    {getInitials(user.name)}
                </div>
                {isUserOnline(user.id) && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
                        style={{ backgroundColor: "#25d366", borderColor: "var(--wa-sidebar-bg)" }} />
                )}
            </div>
            <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate" style={{ color: "var(--wa-text)" }}>{user.name}</p>
                <p className="text-xs truncate mt-0.5" style={{ color: "var(--wa-text-secondary)" }}>{user.email}</p>
            </div>
            {showCheckbox && isSelected && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--wa-green)" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
            )}
        </button>
    );

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 min-h-[60px]"
                style={{ backgroundColor: "var(--wa-header-bg)" }}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white shadow-sm"
                        style={{ backgroundColor: "var(--wa-green)" }}>
                        {session?.user?.name ? getInitials(session.user.name) : "?"}
                    </div>
                    <span className="font-medium text-sm" style={{ color: "var(--wa-text)" }}>
                        {session?.user?.name}
                    </span>
                </div>
                <div className="flex items-center gap-0.5">
                    {/* Dark mode */}
                    <button onClick={toggleDarkMode}
                        className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        title={isDark ? "Light mode" : "Dark mode"}>
                        {isDark ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--wa-text-secondary)" strokeWidth="2">
                                <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--wa-text-secondary)" strokeWidth="2">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        )}
                    </button>
                    {/* New group */}
                    <button onClick={() => { setShowNewGroup(true); setShowSearch(true); }}
                        className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        title="New group">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--wa-text-secondary)" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                    </button>
                    {/* New chat */}
                    <button onClick={() => { setShowSearch(true); setShowNewGroup(false); }}
                        className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        title="New chat">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--wa-text-secondary)" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            <line x1="12" y1="8" x2="12" y2="14" /><line x1="9" y1="11" x2="15" y2="11" />
                        </svg>
                    </button>
                    {/* Logout */}
                    <button onClick={() => signOut({ callbackUrl: "/login" })}
                        className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                        title="Logout">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--wa-text-secondary)" strokeWidth="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Search bar */}
            <div className="px-3 py-2" style={{ backgroundColor: "var(--wa-sidebar-bg)" }}>
                <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="16" height="16"
                        viewBox="0 0 24 24" fill="none" stroke="var(--wa-text-secondary)" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        placeholder={showSearch ? "Search users..." : "Search or start new chat"}
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        onFocus={() => setShowSearch(true)}
                        className="w-full pl-10 pr-10 py-2 rounded-lg text-sm outline-none transition-all"
                        style={{ backgroundColor: "var(--wa-hover)", color: "var(--wa-text)" }}
                    />
                    {showSearch && (
                        <button
                            onClick={() => {
                                setShowSearch(false);
                                setShowNewGroup(false);
                                setSearchQuery("");
                                setSearchResults([]);
                                setSelectedMembers([]);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-black/5 transition-colors"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--wa-text-secondary)" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* New Group form */}
            {showNewGroup && (
                <div className="px-3 py-3 border-b animate-fade-in" style={{ borderColor: "var(--wa-border)" }}>
                    <input
                        type="text"
                        placeholder="Group name..."
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none mb-2 transition-all"
                        style={{ backgroundColor: "var(--wa-hover)", color: "var(--wa-text)" }}
                    />
                    {selectedMembers.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {selectedMembers.map((m) => (
                                <span key={m.id}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium text-white shadow-sm"
                                    style={{ backgroundColor: "var(--wa-green)" }}>
                                    {m.name}
                                    <button onClick={() => setSelectedMembers((prev) => prev.filter((p) => p.id !== m.id))}
                                        className="hover:opacity-70 transition-opacity">×</button>
                                </span>
                            ))}
                        </div>
                    )}
                    <button
                        onClick={handleCreateGroup}
                        disabled={selectedMembers.length === 0 || !groupName.trim()}
                        className="w-full py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-40 transition-all hover:brightness-110 active:scale-[0.98]"
                        style={{ backgroundColor: "var(--wa-green)" }}
                    >
                        Create Group ({selectedMembers.length} members)
                    </button>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Search results */}
                {showSearch && searchQuery && (
                    <div className="animate-fade-in-fast">
                        {isSearching ? (
                            <div className="flex justify-center py-10">
                                <div className="flex gap-1">
                                    <div className="w-2.5 h-2.5 rounded-full typing-dot" style={{ backgroundColor: "var(--wa-green)" }} />
                                    <div className="w-2.5 h-2.5 rounded-full typing-dot" style={{ backgroundColor: "var(--wa-green)" }} />
                                    <div className="w-2.5 h-2.5 rounded-full typing-dot" style={{ backgroundColor: "var(--wa-green)" }} />
                                </div>
                            </div>
                        ) : searchResults.length === 0 ? (
                            <div className="text-center py-10">
                                <svg className="mx-auto mb-3 opacity-30" width="48" height="48" viewBox="0 0 24 24" fill="none"
                                    stroke="var(--wa-text-secondary)" strokeWidth="1.5">
                                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                                <p className="text-sm" style={{ color: "var(--wa-text-secondary)" }}>No users found</p>
                            </div>
                        ) : (
                            searchResults.map((user) =>
                                renderUserCard(
                                    user,
                                    () => {
                                        if (showNewGroup) {
                                            setSelectedMembers((prev) =>
                                                prev.some((m) => m.id === user.id)
                                                    ? prev.filter((m) => m.id !== user.id)
                                                    : [...prev, user]
                                            );
                                        } else {
                                            handleStartConversation(user.id);
                                        }
                                    },
                                    showNewGroup,
                                    selectedMembers.some((m) => m.id === user.id)
                                )
                            )
                        )}
                    </div>
                )}

                {/* Conversation list */}
                {!showSearch && (
                    conversations.length === 0 ? (
                        <div className="animate-fade-in">
                            {allUsers.length > 0 && (
                                <>
                                    <div className="px-4 py-2.5 mt-1">
                                        <p className="text-[11px] font-semibold uppercase tracking-widest"
                                            style={{ color: "var(--wa-green)" }}>
                                            Start a conversation
                                        </p>
                                    </div>
                                    {allUsers.map((user) =>
                                        renderUserCard(user, () => handleStartConversation(user.id))
                                    )}
                                </>
                            )}
                            {allUsers.length === 0 && (
                                <div className="text-center py-16 px-6">
                                    <svg className="mx-auto mb-4 opacity-20" width="64" height="64" viewBox="0 0 24 24" fill="none"
                                        stroke="var(--wa-text-secondary)" strokeWidth="1">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                        <circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                    </svg>
                                    <p className="text-sm" style={{ color: "var(--wa-text-secondary)" }}>
                                        No users available yet.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        conversations.map((conv) => {
                            const name = getConversationName(conv);
                            const avatar = getConversationAvatar(conv);
                            const lastMessage = conv.messages[0];
                            const online = isConversationOnline(conv);
                            const isSelected = selectedConversationId === conv.id;

                            return (
                                <button
                                    key={conv.id}
                                    onClick={() => onSelectConversation(conv.id)}
                                    className="w-full flex items-center gap-3 px-4 py-3 border-b transition-all duration-150"
                                    style={{
                                        borderColor: "var(--wa-border)",
                                        backgroundColor: isSelected ? "var(--wa-hover)" : undefined,
                                    }}
                                >
                                    <div className="relative flex-shrink-0">
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold text-white shadow-sm"
                                            style={{
                                                backgroundColor: conv.isGroup ? "var(--wa-green)" : "#" + (avatar?.id || "000000").slice(0, 6),
                                            }}>
                                            {conv.isGroup ? "G" : getInitials(name)}
                                        </div>
                                        {online && (
                                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
                                                style={{ backgroundColor: "#25d366", borderColor: "var(--wa-sidebar-bg)" }} />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[15px] font-medium truncate" style={{ color: "var(--wa-text)" }}>{name}</p>
                                            {lastMessage && (
                                                <span className="text-[11px] flex-shrink-0 ml-2 tabular-nums"
                                                    style={{ color: conv.unreadCount > 0 ? "var(--wa-unread)" : "var(--wa-text-secondary)" }}>
                                                    {formatTime(lastMessage.createdAt)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between mt-0.5">
                                            <p className="text-[13px] truncate pr-2" style={{ color: "var(--wa-text-secondary)" }}>
                                                {lastMessage
                                                    ? `${lastMessage.senderId === currentUserId ? "You: " : ""}${truncate(lastMessage.body || "📎 Attachment", 35)}`
                                                    : "No messages yet"}
                                            </p>
                                            {conv.unreadCount > 0 && (
                                                <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[11px] font-semibold text-white"
                                                    style={{ backgroundColor: "var(--wa-unread)" }}>
                                                    {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    )
                )}
            </div>
        </div>
    );
}
