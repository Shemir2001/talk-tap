export default function ChatPage() {
    return (
        <div className="h-full flex flex-col items-center justify-center chat-bg">
            <div className="text-center max-w-md px-8 animate-fade-in">
                {/* Logo */}
                <div className="w-28 h-28 mx-auto mb-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(0, 168, 132, 0.08)" }}>
                    <svg viewBox="0 0 303 172" width="180" height="100" fill="none" style={{ opacity: 0.25 }}>
                        <path
                            d="M229.565 160.229c32.647-16.166 54.391-50.161 54.391-89.281 0-55.14-44.711-99.851-99.852-99.851-42.837 0-79.42 26.975-93.613 64.89-3.305-.458-6.678-.695-10.104-.695C35.784 35.292 0 71.078 0 115.68c0 25.544 11.884 48.341 30.418 63.127h181.657c6.392-5.324 12.268-11.218 17.49-17.578z"
                            fill="var(--wa-text-secondary)"
                            fillOpacity="0.12"
                        />
                    </svg>
                </div>

                <h2 className="text-2xl font-light mb-3 tracking-tight" style={{ color: "var(--wa-text)" }}>
                    WhatsApp Web
                </h2>
                <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--wa-text-secondary)" }}>
                    Send and receive messages without keeping your phone online. Use WhatsApp on up to 4 linked devices and 1 phone at the same time.
                </p>

                {/* Encryption badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs"
                    style={{ backgroundColor: "var(--wa-hover)", color: "var(--wa-text-secondary)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    End-to-end encrypted
                </div>
            </div>
        </div>
    );
}
