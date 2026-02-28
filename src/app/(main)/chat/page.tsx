"use client";

export default function ChatEmptyPage() {
    return (
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: "var(--mc-chat-bg)" }}>
            <div className="text-center animate-fade-in max-w-sm px-4">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: "var(--mc-primary)", opacity: 0.1 }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--mc-primary)" strokeWidth="1.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                </div>
                <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--mc-text)" }}>
                    Welcome to MyChats
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: "var(--mc-text-secondary)" }}>
                    Select a conversation from the sidebar or start a new chat to begin messaging.
                </p>
            </div>
        </div>
    );
}
