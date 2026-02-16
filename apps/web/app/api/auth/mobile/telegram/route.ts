import { type NextRequest, NextResponse } from "next/server";

import { createMobileToken } from "@/lib/auth/mobile";
import { getUserFromTelegramData } from "@/lib/telegram/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { initData } = body;

    if (!initData || typeof initData !== "string") {
      return NextResponse.json({ error: "initData is required" }, { status: 400 });
    }

    const user = await getUserFromTelegramData(initData);

    const token = createMobileToken({
      sub: user.id,
      name: user.name ?? "User",
      telegramId: user.telegramAccount?.telegramId,
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    return NextResponse.json({
      token,
      expiresAt,
      user: {
        id: user.id,
        name: user.name,
        telegramId: user.telegramAccount?.telegramId,
        telegramUsername: user.telegramAccount?.username,
      },
    });
  } catch (error) {
    console.error("[mobile/telegram] auth error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
  }
}
