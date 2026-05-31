import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const AUTH_COOKIE_NAME = "bm-session";

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Allow next static files, api routes (public ones or let API handle it), image optimization
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/html2pdf") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Public paths
  const isLoginPage = pathname === "/login";

  const sessionCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  let session = null;
  if (sessionCookie) {
    try {
      const secret = process.env.JWT_SECRET;
      if (secret) {
        const encodedKey = new TextEncoder().encode(secret);
        const { payload } = await jwtVerify(sessionCookie, encodedKey);
        session = payload;
      }
    } catch (e) {
      // Invalid/expired token
    }
  }

  // Auth routing logic
  if (!session && !isLoginPage) {
    // Redirect to login if trying to access a protected route
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (session && isLoginPage) {
    // Redirect to dashboard if already logged in and trying to visit login
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * 1. /api/ (unless we want to protect specific API endpoints here)
     * 2. _next/static (static files)
     * 3. _next/image (image optimization)
     * 4. favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico|api/html2pdf).*)",
  ],
};
