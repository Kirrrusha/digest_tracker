import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { disconnectSession } from "@/lib/mtproto/service";

/**
 * POST /api/mtproto/auth/disconnect
 * Деактивирует MTProto сессию пользователя
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await disconnectSession(session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("MTProto disconnect error:", error);
    return NextResponse.json({ error: "Не удалось отключить сессию" }, { status: 500 });
  }
}
