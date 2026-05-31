import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const AUTH_COOKIE_NAME = "bm-session";
const SESSION_DURATION_DAYS = 7;

function getSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Create a session token and set it as an HttpOnly cookie.
 * @param {{ userId: number, userName: string, email: string, role: string }} user
 */
export async function createSession(user) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  const token = await new SignJWT({
    userId: user.userId,
    userName: user.userName,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: expiresAt,
    path: "/",
  });

  return token;
}

/**
 * Read and verify the session from the cookie.
 * Returns the session payload or null if invalid/missing.
 * @returns {Promise<{ userId: number, userName: string, email: string, role: string } | null>}
 */
export async function getSession() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME);

    if (!sessionCookie?.value) {
      return null;
    }

    const { payload } = await jwtVerify(sessionCookie.value, getSecretKey());
    return {
      userId: payload.userId,
      userName: payload.userName,
      email: payload.email,
      role: payload.role,
    };
  } catch (error) {
    // Token expired, tampered, or missing — treat as unauthenticated
    return null;
  }
}

/**
 * Delete the session cookie (logout).
 */
export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

/**
 * Verify a token string directly (used by middleware where cookies() is unavailable).
 * @param {string} token
 * @returns {Promise<{ userId: number, userName: string, email: string, role: string } | null>}
 */
export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return {
      userId: payload.userId,
      userName: payload.userName,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

import { SYSTEM_BUSINESS_ID } from "./constants";

export { AUTH_COOKIE_NAME };

/**
 * Explicitly injects userId and businessId into repository create/update payloads.
 * @param {Object} data - Payload to be enriched
 * @returns {Promise<Object>} The enriched payload
 */
export async function withOwnership(data = {}) {
  let userId = 0;
  try {
    const session = await getSession();
    if (session) {
      userId = session.userId || 0;
    }
  } catch (error) {
    // Session context not available
  }

  return {
    ...data,
    userId: data.userId !== undefined ? data.userId : userId,
    businessId: data.businessId !== undefined ? data.businessId : SYSTEM_BUSINESS_ID,
  };
}
