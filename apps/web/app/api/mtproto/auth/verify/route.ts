import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { saveSession, signIn } from "@/lib/mtproto/service";

/**
 * POST /api/mtproto/auth/verify
 * Верифицирует код подтверждения и сохраняет MTProto сессию.
 * Если у пользователя включена 2FA, возвращает needs2FA=true.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionString, phoneNumber, phoneCode, phoneCodeHash, password } = body;

    if (!sessionString || !phoneNumber || !phoneCode || !phoneCodeHash) {
      return NextResponse.json(
        { error: "Обязательные поля: sessionString, phoneNumber, phoneCode, phoneCodeHash" },
        { status: 400 }
      );
    }

    const result = await signIn({
      sessionString,
      phoneNumber,
      phoneCode,
      phoneCodeHash,
      password: password || undefined,
    });

    await saveSession(session.user.id, result.sessionString, phoneNumber);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("MTProto verify error:", error);
    const message = error instanceof Error ? error.message : "Не удалось авторизоваться";
    const needs2FA = message.includes("двухфакторной");
    return NextResponse.json({ error: message, needs2FA }, { status: 400 });
  }
}
