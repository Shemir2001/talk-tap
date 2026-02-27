"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/actions/auth";

export default function LoginPage() {
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const result = await login(formData);

        if (result.error) {
            setError(result.error);
            setLoading(false);
        } else {
            router.push("/chat");
            router.refresh();
        }
    }

    return (
        <div className="min-h-[100dvh] flex items-center justify-center px-4 py-8"
            style={{ background: "linear-gradient(135deg, var(--wa-teal) 0%, var(--wa-green-dark) 100%)" }}>
            <div className="w-full max-w-md animate-fade-in">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
                        <svg viewBox="0 0 39 39" width="48" height="48" fill="white">
                            <path d="M10.7 32.8l.6.3c2.5 1.5 5.3 2.2 8.1 2.2 8.8 0 16-7.2 16-16 0-4.2-1.7-8.3-4.7-11.3s-7-4.7-11.3-4.7c-8.8 0-16 7.2-15.9 16.1 0 3 .9 5.9 2.4 8.4l.4.6-1.6 5.9 6-1.5z" />
                            <path fill="var(--wa-teal)" d="M32.4 6.4C29 2.9 24.3 1 19.5 1 9.3 1 1.1 9.3 1.2 19.4c0 3.2.9 6.3 2.4 9.1L1 38l9.7-2.5c2.7 1.5 5.7 2.2 8.7 2.2 10.1 0 18.3-8.3 18.3-18.4 0-4.9-1.9-9.5-5.3-12.9zM19.5 34.6c-2.7 0-5.4-.7-7.7-2.1l-.6-.3-5.8 1.5L6.9 28l-.4-.6c-4.4-7.1-2.3-16.5 4.9-20.9s16.5-2.3 20.9 4.9 2.3 16.5-4.9 20.9c-2.3 1.5-5.1 2.3-7.9 2.3zm8.8-11.1l-1.1-.5s-1.6-.7-2.6-1.2c-.1 0-.2-.1-.3-.1-.3 0-.5.1-.7.3 0 0-.1.1-1.5 1.7-.1.2-.3.3-.5.3h-.1c-.1 0-.3-.1-.4-.2l-.5-.2c-1.1-.5-2.1-1.1-2.9-1.9-.2-.2-.5-.4-.7-.6-.7-.7-1.4-1.5-1.9-2.4l-.1-.2c-.1-.1-.1-.2-.2-.4 0-.2 0-.4.1-.5 0 0 .4-.5.7-.8.2-.2.3-.5.5-.7.2-.3.3-.7.2-1-.1-.5-1.3-3.2-1.6-3.8-.2-.3-.4-.4-.7-.5h-1.1c-.2 0-.4.1-.6.1l-.1.1c-.2.1-.4.3-.6.4-.2.2-.3.4-.5.6-.7.9-1.1 2-1.1 3.1 0 .8.2 1.6.5 2.3l.1.3c.9 1.9 2.1 3.6 3.7 5.1l.4.4c.3.3.6.5.8.8 2.1 1.8 4.5 3.1 7.2 3.8.3.1.7.1 1 .2h1c.5 0 1.1-.2 1.5-.4.3-.2.5-.2.7-.4l.2-.2c.2-.2.4-.3.6-.5s.3-.4.5-.6c.2-.4.3-.9.4-1.4v-.7s-.1-.1-.3-.2z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-light text-white tracking-wide">WhatsApp Web</h1>
                </div>

                {/* Form Card */}
                <div className="rounded-2xl shadow-2xl p-6 sm:p-8" style={{ backgroundColor: "var(--wa-sidebar-bg)" }}>
                    <h2 className="text-xl font-semibold mb-6 text-center" style={{ color: "var(--wa-text)" }}>
                        Sign in to your account
                    </h2>

                    {error && (
                        <div className="mb-4 p-3 rounded-lg text-sm text-red-700 bg-red-50 border border-red-200 animate-fade-in">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: "var(--wa-text-secondary)" }}>
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="w-full px-4 py-3 rounded-lg border text-sm outline-none transition-all focus:ring-2"
                                style={{
                                    borderColor: "var(--wa-border)",
                                    backgroundColor: "var(--wa-input-bg)",
                                    color: "var(--wa-text)",
                                }}
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: "var(--wa-text-secondary)" }}>
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="w-full px-4 py-3 rounded-lg border text-sm outline-none transition-all focus:ring-2"
                                style={{
                                    borderColor: "var(--wa-border)",
                                    backgroundColor: "var(--wa-input-bg)",
                                    color: "var(--wa-text)",
                                }}
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 rounded-lg text-white font-medium text-sm transition-all hover:opacity-90 disabled:opacity-50"
                            style={{ backgroundColor: "var(--wa-green)" }}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Signing in...
                                </span>
                            ) : (
                                "Sign In"
                            )}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm" style={{ color: "var(--wa-text-secondary)" }}>
                        Don&apos;t have an account?{" "}
                        <Link href="/register" className="font-medium hover:underline" style={{ color: "var(--wa-green)" }}>
                            Create one
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
