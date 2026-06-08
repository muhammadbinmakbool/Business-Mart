import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getSession } from "./session";

const DESTRUCTIVE_COOKIE_NAME = "bm-destructive";
const DESTRUCTIVE_SESSION_MINUTES = 10;

function getSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set");
  return new TextEncoder().encode(secret);
}

/**
 * Creates a time-limited destructive session token stored as an HttpOnly cookie.
 * Only valid for the authenticated admin user.
 * @param {number} userId
 */
export async function createDestructiveSession(userId) {
  const expiresAt = new Date(Date.now() + DESTRUCTIVE_SESSION_MINUTES * 60 * 1000);

  const token = await new SignJWT({ userId, grantedAt: Date.now() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(DESTRUCTIVE_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: expiresAt,
    path: "/",
  });
}

/**
 * Validates that an active destructive session exists for the given userId.
 * Returns the session payload or null if invalid/expired/mismatched.
 * @param {number} userId
 * @returns {Promise<Object|null>}
 */
export async function validateDestructiveSession(userId) {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(DESTRUCTIVE_COOKIE_NAME);
    if (!cookie?.value) return null;

    const { payload } = await jwtVerify(cookie.value, getSecretKey());
    if (Number(payload.userId) !== Number(userId)) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Revokes the destructive session by deleting the cookie.
 */
export async function deleteDestructiveSession() {
  const cookieStore = await cookies();
  cookieStore.delete(DESTRUCTIVE_COOKIE_NAME);
}

/**
 * Asserts that the currently authenticated admin has an active destructive session.
 * Throws a security error if the session is not valid.
 * Used as a guard inside hard-delete repository methods.
 * @returns {Promise<{ session: Object, destructivePayload: Object }>}
 */
export async function assertDestructiveMode() {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized: Active session required for destructive operations.");
  }

  const { canDeleteRecord } = await import("./permissions");
  if (!canDeleteRecord(session.role)) {
    throw new Error("Forbidden: Only administrators may perform destructive operations.");
  }

  const destructivePayload = await validateDestructiveSession(session.userId);
  if (!destructivePayload) {
    throw new Error(
      "Destructive Mode is not active. Enter Destructive Mode from the admin menu to enable permanent deletions."
    );
  }

  return { session, destructivePayload };
}

export { DESTRUCTIVE_COOKIE_NAME, DESTRUCTIVE_SESSION_MINUTES };
