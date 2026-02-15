import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { sendAuthCode } from "@/lib/mtproto/service";

/**
 * POST /api/mtproto/auth/send-code
 * Отправляет код подтверждения на номер телефона для авторизации MTProto
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
