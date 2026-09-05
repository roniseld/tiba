import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { createHash, randomInt } from "crypto";
import { db } from "./db";
import type { User } from "./types";

const COOKIE = "tiba_session";
const SESSION_DAYS = 90;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET חסר או קצר מדי");
  return new TextEncoder().encode(s);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 3600,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const id = await getSessionUserId();
  if (!id) return null;
  const { data } = await db().from("users").select("*").eq("id", id).maybeSingle();
  return (data as User) ?? null;
}

/** דורש משתמש מחובר ופעיל. מחזיר null אם לא — הקורא מחליט על הפניה. */
export async function requireActiveUser(): Promise<User | null> {
  const u = await getCurrentUser();
  if (!u || u.status !== "active") return null;
  return u;
}

// ---------- קודים חד-פעמיים ----------

export function hashCode(phone: string, code: string) {
  return createHash("sha256").update(`${phone}:${code}:${process.env.AUTH_SECRET}`).digest("hex");
}

export function generateCode() {
  return String(randomInt(0, 1000000)).padStart(6, "0");
}

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MIN_INTERVAL_SECONDS = 45;
