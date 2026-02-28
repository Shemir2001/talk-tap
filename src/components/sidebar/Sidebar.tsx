"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { searchUsers } from "@/actions/users";
import { createConversation } from "@/actions/conversations";
import { formatTime, getInitials, truncate } from "@/lib/utils";
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
}: SidebarProps) {
    const { data: session } = useSession();
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SafeUser[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [allUsers, setAllUsers] = useState<SafeUser[]>([]);
    const [showNewChat, setShowNewChat] = useState(false);
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

    // Fetch all users on mount
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
                setIsSearching(false);
                return;
            }
            setIsSearching(true);
            searchTimeout.current = setTimeout(async () => {
                const result = await searchUsers(query);
                if (result.users) setSearchResults(result.users as SafeUser[]);
                setIsSearching(false);
            }, 300);
        },
        []
    );

    const handleStartChat = useCallback(
        async (userId: string) => {
            const result = await createConversation({ memberIds: [userId] });
            if (result.conversation) {
                onConversationCreated();
                onSelectConversation(result.conversation.id);
                setSearchQuery("");
                setSearchResults([]);
                setShowNewChat(false);
            }
        },
        [onConversationCreated, onSelectConversation]
    );

    // Split conversations into direct chats and groups
    const directChats = conversations.filter((c) => !c.isGroup);
    const groupChats = conversations.filter((c) => c.isGroup);

    // Users without existing conversations
    const usersWithoutConvo = allUsers.filter(
        (u) => !directChats.some((c) => c.members.some((m: any) => m.userId === u.id))
    );

    return (
        <div className="flex flex-col h-full">
            {/* Search Header */}
            <div className="px-5 pt-5 pb-3">
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40"
                            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mc-text-secondary)" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Search"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                            style={{
                                backgroundColor: "var(--mc-input-bg)",
                                color: "var(--mc-text)",
                            }}
                        />
                    </div>
                    <button
                        onClick={() => setShowNewChat(!showNewChat)}
                        className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors"
                        style={{
                            backgroundColor: showNewChat ? "var(--mc-primary)" : "var(--mc-input-bg)",
                            color: showNewChat ? "white" : "var(--mc-text)",
                        }}
                    >
                        New Chats
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-3">
                {/* Search Results */}
                {searchQuery && (
                    <div className="mb-4">
                        {isSearching ? (
                            <div className="text-center py-8">
                                <div className="flex justify-center gap-1">
                                    <div className="w-2 h-2 rounded-full typing-dot" style={{ backgroundColor: "var(--mc-primary)" }} />
                                    <div className="w-2 h-2 rounded-full typing-dot" style={{ backgroundColor: "var(--mc-primary)" }} />
                                    <div className="w-2 h-2 rounded-full typing-dot" style={{ backgroundColor: "var(--mc-primary)" }} />
                                </div>
                            </div>
                        ) : searchResults.length === 0 ? (
                            <p className="text-center py-8 text-sm" style={{ color: "var(--mc-text-secondary)" }}>
                                No users found
                            </p>
                        ) : (
                            searchResults.map((user) => (
                                <UserCard
                                    key={user.id}
                                    user={user}
                                    isOnline={isUserOnline(user.id)}
                                    onClick={() => handleStartChat(user.id)}
                                />
                            ))
                        )}
                    </div>
                )}

                {/* New Chat - All Users */}
                {showNewChat && !searchQuery && (
                    <div className="mb-4 animate-fade-in">
                        <SectionHeader title="All Users" />
                        {usersWithoutConvo.length > 0 ? (
                            usersWithoutConvo.map((user) => (
                                <UserCard
                                    key={user.id}
                                    user={user}
                                    isOnline={isUserOnline(user.id)}
                                    onClick={() => handleStartChat(user.id)}
                                />
                            ))
                        ) : (
                            <p className="text-center py-4 text-xs" style={{ color: "var(--mc-text-secondary)" }}>
                                All users have existing chats
                            </p>
                        )}
                    </div>
                )}

                {/* Chats Section */}
                {!searchQuery && (
                    <>
                        <SectionHeader title="Chats" count={directChats.length} />
                        {directChats.length === 0 && usersWithoutConvo.length > 0 ? (
                            // Show all users when no conversations exist
                            allUsers.map((user) => (
                                <UserCard
                                    key={user.id}
                                    user={user}
                                    isOnline={isUserOnline(user.id)}
                                    onClick={() => handleStartChat(user.id)}
                                />
                            ))
                        ) : (
                            directChats.map((conv) => (
                                <ConversationCard
                                    key={conv.id}
                                    conversation={conv}
                                    isSelected={conv.id === selectedConversationId}
                                    isOnline={isUserOnline(
                                        conv.members.find((m: any) => m.userId !== currentUserId)?.userId || ""
                                    )}
                                    currentUserId={currentUserId}
                                    onClick={() => onSelectConversation(conv.id)}
                                />
                            ))
                        )}

                        {/* Groups Section */}
                        {groupChats.length > 0 && (
                            <>
                                <SectionHeader title="Group" count={groupChats.length} />
                                {groupChats.map((conv) => (
                                    <ConversationCard
                                        key={conv.id}
                                        conversation={conv}
                                        isSelected={conv.id === selectedConversationId}
                                        isOnline={false}
                                        currentUserId={currentUserId}
                                        onClick={() => onSelectConversation(conv.id)}
                                    />
                                ))}
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// Section Header
function SectionHeader({ title, count }: { title: string; count?: number }) {
    return (
        <div className="flex items-center justify-between px-2 py-3">
            <h3 className="text-sm font-bold" style={{ color: "var(--mc-text)" }}>{title}</h3>
            {count !== undefined && count > 0 && (
                <button className="text-xs font-medium" style={{ color: "var(--mc-text-secondary)" }}>
                    See All
                </button>
            )}
        </div>
    );
}

// User Card (for search results / new chat)
function UserCard({
    user, isOnline, onClick,
}: {
    user: SafeUser; isOnline: boolean; onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover-card"
        >
            <div className="relative">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold text-white overflow-hidden"
                    style={{ backgroundColor: "#" + user.id.slice(0, 6) }}>
                    {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                        getInitials(user.name)
                    )}
                </div>
                {isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                        style={{ backgroundColor: "var(--mc-green)", borderColor: "var(--mc-sidebar-right)" }} />
                )}
            </div>
            <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: "var(--mc-text)" }}>{user.name}</p>
                <p className="text-xs truncate" style={{ color: "var(--mc-text-secondary)" }}>
                    {(user as any).username ? `@${(user as any).username}` : user.email}
                </p>
            </div>
        </button>
    );
}

// Conversation Card
function ConversationCard({
    conversation, isSelected, isOnline, currentUserId, onClick,
}: {
    conversation: ConversationWithDetails & { unreadCount: number };
    isSelected: boolean; isOnline: boolean; currentUserId: string;
    onClick: () => void;
}) {
    const otherMember = conversation.members.find((m: any) => m.userId !== currentUserId);
    const name = conversation.isGroup
        ? conversation.name || "Group"
        : otherMember?.user.name || "Unknown";
    const avatar = conversation.isGroup ? null : otherMember?.user.avatar;
    const lastMessage = conversation.messages[0];
    const lastText = lastMessage
        ? lastMessage.body
            ? truncate(lastMessage.body, 30)
            : "📎 Attachment"
        : "";
    const lastTime = lastMessage ? formatTime(lastMessage.createdAt) : "";
    const hasUnread = conversation.unreadCount > 0;

    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
            style={{
                backgroundColor: isSelected ? "var(--mc-selected)" : undefined,
            }}
            onMouseEnter={(e) => {
                if (!isSelected) e.currentTarget.style.backgroundColor = "var(--mc-hover)";
            }}
            onMouseLeave={(e) => {
                if (!isSelected) e.currentTarget.style.backgroundColor = "";
            }}
        >
            <div className="relative flex-shrink-0">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold text-white overflow-hidden"
                    style={{ backgroundColor: conversation.isGroup ? "var(--mc-primary)" : "#" + (otherMember?.user.id || "888").slice(0, 6) }}>
                    {avatar ? (
                        <img src={avatar} alt={name} className="w-full h-full object-cover" />
                    ) : conversation.isGroup ? (
                        "G"
                    ) : (
                        getInitials(name)
                    )}
                </div>
                {isOnline && !conversation.isGroup && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                        style={{ backgroundColor: "var(--mc-green)", borderColor: "var(--mc-sidebar-right)" }} />
                )}
            </div>
            <div className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between">
                    <p className={`text-sm truncate ${hasUnread ? "font-bold" : "font-semibold"}`} style={{ color: "var(--mc-text)" }}>
                        {name}
                    </p>
                    <span className="text-[11px] ml-2 flex-shrink-0"
                        style={{ color: hasUnread ? "var(--mc-primary)" : "var(--mc-text-secondary)" }}>
                        {lastTime}
                    </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                    <p className={`text-xs truncate ${hasUnread ? "font-medium" : ""}`}
                        style={{ color: "var(--mc-text-secondary)" }}>
                        {lastText}
                    </p>
                    {hasUnread && (
                        <span className="ml-2 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: "var(--mc-unread)" }}>
                            {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
}
