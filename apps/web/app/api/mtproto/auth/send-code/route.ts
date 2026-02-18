import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { getCache, setCache } from "@/lib/cache/redis";
import { sendAuthCode } from "@/lib/mtproto/service";

const RATE_LIMIT_MAX = 2;
const RATE_LIMIT_WINDOW_SEC = 3600; // 1 час

async function checkRateLimit(userId: string): Promise<boolean> {
  const key = `mtproto:send-code:${userId}`;
  const current = await getCache<number>(key);
  if (current !== null && current >= RATE_LIMIT_MAX) {
    return false;
  }
  const next = (current ?? 0) + 1;
  await setCache(key, next, RATE_LIMIT_WINDOW_SEC);
  return true;
}

/**
 * POST /api/mtproto/auth/send-code
 * Отправляет код подтверждения на номер телефона для авторизации MTProto
 * Rate limit: 3 попытки в час на пользователя
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { phoneNumber } = body;

    if (!phoneNumber || typeof phoneNumber !== "string") {
      return NextResponse.json({ error: "Номер телефона обязателен" }, { status: 400 });
    }

    const cleanPhone = phoneNumber.replace(/\s/g, "");
    if (!/^\+\d{10,15}$/.test(cleanPhone)) {
      return NextResponse.json(
        {
          error: "Неверный формат номера телефона. Используйте международный формат: +7XXXXXXXXXX",
        },
        { status: 400 }
      );
    }

    const allowed = await checkRateLimit(session.user.id);
    if (!allowed) {
      return NextResponse.json(
        { error: "Слишком много попыток. Попробуйте через час." },
        { status: 429 }
      );
    }

    const result = await sendAuthCode(cleanPhone);

    return NextResponse.json({
      phoneCodeHash: result.phoneCodeHash,
      sessionString: result.sessionString,
    });
  } catch (error) {
    console.error("MTProto send-code error:", error);
    const message = error instanceof Error ? error.message : "Не удалось отправить код";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
