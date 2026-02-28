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
            style={{ background: "linear-gradient(135deg, #1B2838 0%, #7C3AED 50%, #1B2838 100%)" }}>
            <div className="w-full max-w-md animate-fade-in">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                        style={{ backgroundColor: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)" }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-semibold text-white tracking-wide">MyChats</h1>
                    <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>Welcome back</p>
                </div>

                {/* Form Card */}
                <div className="rounded-2xl shadow-2xl p-6 sm:p-8"
                    style={{ backgroundColor: "var(--mc-sidebar-right)", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
                    <h2 className="text-xl font-semibold mb-6 text-center" style={{ color: "var(--mc-text)" }}>
                        Sign in to your account
                    </h2>

                    {error && (
                        <div className="mb-4 p-3 rounded-xl text-sm text-red-700 bg-red-50 border border-red-200 animate-fade-in">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: "var(--mc-text-secondary)" }}>
                                Email address
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all focus:ring-2"
                                style={{
                                    borderColor: "var(--mc-border)",
                                    backgroundColor: "var(--mc-input-bg)",
                                    color: "var(--mc-text)",
                                    focusRingColor: "var(--mc-primary)",
                                } as any}
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: "var(--mc-text-secondary)" }}>
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all focus:ring-2"
                                style={{
                                    borderColor: "var(--mc-border)",
                                    backgroundColor: "var(--mc-input-bg)",
                                    color: "var(--mc-text)",
                                } as any}
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 rounded-xl text-white font-medium text-sm transition-all hover:opacity-90 disabled:opacity-50"
                            style={{ backgroundColor: "var(--mc-primary)" }}
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

                    <p className="mt-6 text-center text-sm" style={{ color: "var(--mc-text-secondary)" }}>
                        Don&apos;t have an account?{" "}
                        <Link href="/register" className="font-medium hover:underline" style={{ color: "var(--mc-primary)" }}>
                            Create one
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
