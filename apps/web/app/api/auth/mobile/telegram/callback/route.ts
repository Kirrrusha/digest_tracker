import { NextResponse, type NextRequest } from "next/server";

import { createMobileToken } from "@/lib/auth/mobile";
import {
  getUserFromLoginWidgetData,
  validateLoginWidgetData,
  type LoginWidgetData,
} from "@/lib/telegram/auth";

/**
 * GET /api/auth/mobile/telegram/callback
 *
 * Telegram Login Widget редиректит сюда после авторизации пользователя.
 * Параметры: id, first_name, last_name?, username?, photo_url?, auth_date, hash
 *
 * После валидации создаёт JWT и редиректит на devdigest://auth/callback?token=...
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Собираем все параметры от Telegram
  const data: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    data[key] = value;
  });

  const errorRedirect = (msg: string) =>
    NextResponse.redirect(`devdigest://auth/callback?error=${encodeURIComponent(msg)}`);

  // Проверяем обязательные поля
  if (!data.id || !data.auth_date || !data.hash) {
    return errorRedirect("missing_fields");
  }

  // Валидируем подпись виджета
  if (!validateLoginWidgetData(data)) {
    return errorRedirect("invalid_signature");
  }

  try {
    const user = await getUserFromLoginWidgetData(data as unknown as LoginWidgetData);

    const token = createMobileToken({
      sub: user.id,
      name: user.name ?? data.first_name,
      telegramId: data.id,
    });

    // Редиректим в мобильное приложение с токеном
    return NextResponse.redirect(`devdigest://auth/callback?token=${encodeURIComponent(token)}`);
  } catch (error) {
    console.error("[telegram/callback]", error);
    return errorRedirect("server_error");
  }
}
