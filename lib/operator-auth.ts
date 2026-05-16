import { NextResponse } from "next/server";

export const OPERATOR_SESSION_COOKIE = "clawbot_operator_session";

function getAuthSecret() {
  return process.env.CLAWBOT_OPERATOR_SECRET?.trim() || "";
}

export function isOperatorAuthEnabled() {
  return getAuthSecret().length > 0 || Boolean(process.env.DATABASE_URL?.trim());
}

export function getExpectedSessionToken() {
  throw new Error("Use getExpectedSessionTokenAsync()");
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return "";
  const parts = cookieHeader.split(";").map((part) => part.trim());
  const found = parts.find((part) => part.startsWith(`${name}=`));
  if (!found) return "";
  return decodeURIComponent(found.slice(name.length + 1));
}

export async function getExpectedSessionTokenAsync() {
  const secret = getAuthSecret();
  if (!secret) return "";
  return sha256Hex(secret);
}

export async function createSessionCookieValue(password: string) {
  return sha256Hex(password);
}

export async function hasValidOperatorSessionFromHeader(cookieHeader: string | null) {
  if (!isOperatorAuthEnabled()) return true;
  const expected = await getExpectedSessionTokenAsync();
  if (!expected) return false;
  return getCookieValue(cookieHeader, OPERATOR_SESSION_COOKIE) === expected;
}

export async function hasValidOperatorSessionFromRequest(request: Request) {
  return hasValidOperatorSessionFromHeader(request.headers.get("cookie"));
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function buildSessionCookie(value: string) {
  return {
    name: OPERATOR_SESSION_COOKIE,
    value,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

export function clearSessionCookie() {
  return {
    name: OPERATOR_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}
