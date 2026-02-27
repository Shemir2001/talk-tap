export default function ChatPage() {
    return (
        <div className="h-full flex flex-col items-center justify-center chat-bg">
            <div className="text-center max-w-md px-8">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center opacity-30"
                    style={{ backgroundColor: "var(--wa-border)" }}>
                    <svg viewBox="0 0 303 172" width="200" height="120" fill="none" style={{ opacity: 0.4 }}>
                        <path
                            d="M229.565 160.229c32.647-16.166 54.391-50.161 54.391-89.281 0-55.14-44.711-99.851-99.852-99.851-42.837 0-79.42 26.975-93.613 64.89-3.305-.458-6.678-.695-10.104-.695C35.784 35.292 0 71.078 0 115.68c0 25.544 11.884 48.341 30.418 63.127h181.657c6.392-5.324 12.268-11.218 17.49-17.578z"
                            fill="var(--wa-text-secondary)"
                            fillOpacity="0.08"
                        />
                    </svg>
                </div>
                <h2 className="text-2xl font-light mb-3" style={{ color: "var(--wa-text)" }}>
                    WhatsApp Web
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: "var(--wa-text-secondary)" }}>
                    Send and receive messages. Start a conversation by selecting a chat from the sidebar or search for a user.
                </p>
                <div className="mt-6 flex items-center justify-center gap-2 text-xs" style={{ color: "var(--wa-text-secondary)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    End-to-end encrypted
                </div>
            </div>
        </div>
    );
}
