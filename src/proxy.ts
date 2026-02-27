import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
    const { nextUrl } = req;
    const isLoggedIn = !!req.auth;

    const isAuthPage = nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/register");
    const isApiRoute = nextUrl.pathname.startsWith("/api");
    const isPublicRoute = nextUrl.pathname === "/";

    // Allow API routes to pass through
    if (isApiRoute) return NextResponse.next();

    // Redirect logged-in users away from auth pages
    if (isAuthPage && isLoggedIn) {
        return NextResponse.redirect(new URL("/chat", nextUrl));
    }

    // Protect chat routes
    if (!isLoggedIn && !isAuthPage && !isPublicRoute) {
        return NextResponse.redirect(new URL("/login", nextUrl));
    }

    return NextResponse.next();
});

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads).*)"],
};
