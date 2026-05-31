import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const AUTH_COOKIE_NAME = "bm-session";

export default async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Allow next static files, public assets, and specific routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/html2pdf") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

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
      // Invalid or expired token
    }
  }

  // Route protection
  if (!session && !isLoginPage) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (session && isLoginPage) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Settings direct URL access protection
  if (session && pathname.startsWith("/settings")) {
    const role = session.role;
    if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
      const dashboardUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/html2pdf).*)",
  ],
};
