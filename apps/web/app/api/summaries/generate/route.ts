import { NextResponse, type NextRequest } from "next/server";

import { generateDailySummary, generateWeeklySummary } from "@/lib/ai/summarizer";
import { getSessionUserId } from "@/lib/auth/mobile";
import { getUserFromTelegramData } from "@/lib/telegram/auth";

/**
 * POST /api/summaries/generate
 *
 * Генерация саммари для пользователя.
 * Поддерживает:
 * - Bearer token (mobile)
 * - X-Telegram-Init-Data (Telegram Mini App)
 * - Cookie-based NextAuth (web)
 */
export async function POST(req: NextRequest) {
  try {
    let userId: string | null = null;

    // Пробуем Bearer token или cookie auth
    userId = await getSessionUserId(req);

    // Fallback: Telegram Mini App initData
    if (!userId) {
      const initData = req.headers.get("X-Telegram-Init-Data");
      if (initData) {
        const user = await getUserFromTelegramData(initData);
        userId = user?.id ?? null;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Получаем параметры из body
    const body = await req.json().catch(() => ({}));
    const { type = "daily", period } = body;
    // Поддерживаем оба поля: type (legacy) и period (mobile)
    const summaryType: string = period ?? type;

    // Генерируем саммари
    let summary;

    if (summaryType === "weekly") {
      summary = await generateWeeklySummary(userId);
    } else {
      summary = await generateDailySummary(userId);
    }

    return NextResponse.json({
      success: true,
      summary: {
        id: summary.id,
        title: summary.title,
        topics: summary.topics,
        period: summary.period,
        createdAt: summary.createdAt,
      },
    });
  } catch (error) {
    console.error("Error generating summary:", error);

    const errorMessage = error instanceof Error ? error.message : "Failed to generate summary";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
