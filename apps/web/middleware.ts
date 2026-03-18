import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_ROUTES = ["/", "/features", "/archive"];
const AUTH_ROUTES = ["/auth/login", "/auth/signup", "/auth/callback", "/auth/confirm", "/auth/reset-password"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always refresh session
  const { supabaseResponse, user } = await updateSession(request);

  // Public routes — always allow
  if (PUBLIC_ROUTES.includes(pathname)) {
    return supabaseResponse;
  }

  // Auth routes — redirect authenticated users
  if (AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    if (user) {
      const url = request.nextUrl.clone();
      // Admin goes straight to admin dashboard, regular users to feed
      url.pathname = user.app_metadata?.role === "admin" ? "/admin" : "/feed";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Admin routes — hide existence from non-admins (return 404)
  if (pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.rewrite(new URL("/not-found", request.url));
    }
    const role = user.app_metadata?.role;
    if (role !== "admin") {
      return NextResponse.rewrite(new URL("/not-found", request.url));
    }
    return supabaseResponse;
  }

  // API routes — pass through
  if (pathname.startsWith("/api")) {
    return supabaseResponse;
  }

  // All other routes (app routes) — require authentication
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Admin users hitting regular app routes get redirected to admin dashboard
  if (user.app_metadata?.role === "admin" && pathname.startsWith("/feed")) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
