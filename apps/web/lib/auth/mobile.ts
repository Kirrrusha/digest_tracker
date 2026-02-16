import crypto from "crypto";
import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";

const JWT_SECRET = () => {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not defined");
  return secret;
};

const TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface MobileTokenPayload {
  sub: string;
  name: string;
  telegramId?: string;
  iat: number;
  exp: number;
}

function base64urlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function base64urlDecode(str: string): string {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64").toString("utf8");
}

export function createMobileToken(payload: Omit<MobileTokenPayload, "iat" | "exp">): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + TOKEN_EXPIRY_SECONDS;

  const header = base64urlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64urlEncode(JSON.stringify({ ...payload, iat, exp }));

  const signature = crypto
    .createHmac("sha256", JWT_SECRET())
    .update(`${header}.${body}`)
    .digest("base64url");

  return `${header}.${body}.${signature}`;
}

export function verifyMobileToken(token: string): MobileTokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;

    const expectedSig = crypto
      .createHmac("sha256", JWT_SECRET())
      .update(`${header}.${body}`)
      .digest("base64url");

    if (expectedSig !== signature) return null;

    const payload = JSON.parse(base64urlDecode(body)) as MobileTokenPayload;

    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

export function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

/**
 * Получить userId из Bearer token. Возвращает null если токен невалиден.
 */
export function getMobileUserId(request: NextRequest): string | null {
  const token = extractBearerToken(request);
  if (!token) return null;
  const payload = verifyMobileToken(token);
  return payload?.sub ?? null;
}

/**
 * Универсальный helper: поддерживает и Bearer token (mobile) и cookie-based NextAuth (web).
 * Возвращает userId или null если не аутентифицирован.
 */
export async function getSessionUserId(request: NextRequest): Promise<string | null> {
  // Bearer token (mobile) имеет приоритет
  const mobileUserId = getMobileUserId(request);
  if (mobileUserId) return mobileUserId;

  // Cookie-based NextAuth (web)
  const session = await auth();
  return session?.user?.id ?? null;
}
