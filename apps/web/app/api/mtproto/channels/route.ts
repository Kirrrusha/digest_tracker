import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { listUserChannels } from "@/lib/mtproto/service";

/**
 * GET /api/mtproto/channels
 * Возвращает список Telegram-каналов пользователя через MTProto
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const channels = await listUserChannels(session.user.id);

    return NextResponse.json(channels);
  } catch (error) {
    console.error("MTProto channels error:", error);
    const message = error instanceof Error ? error.message : "Не удалось получить список каналов";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
