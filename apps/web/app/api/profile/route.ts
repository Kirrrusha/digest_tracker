import { type NextRequest, NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth/mobile";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        telegramAccount: {
          select: { telegramId: true, username: true, firstName: true },
        },
        preferences: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      telegramId: user.telegramAccount?.telegramId,
      telegramUsername: user.telegramAccount?.username,
      preferences: user.preferences,
    });
  } catch (error) {
    console.error("[GET /api/profile]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
