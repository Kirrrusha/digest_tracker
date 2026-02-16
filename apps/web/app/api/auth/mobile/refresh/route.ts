import { type NextRequest, NextResponse } from "next/server";

import {
  createMobileToken,
  extractBearerToken,
  getMobileUserId,
  verifyMobileToken,
} from "@/lib/auth/mobile";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const token = extractBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "No token provided" }, { status: 401 });
  }

  const payload = verifyMobileToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  // Verify user still exists
  const user = await db.user.findUnique({
    where: { id: payload.sub },
    include: { telegramAccount: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  const newToken = createMobileToken({
    sub: user.id,
    name: user.name ?? "User",
    telegramId: user.telegramAccount?.telegramId,
  });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  return NextResponse.json({ token: newToken, expiresAt });
}
