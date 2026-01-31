import { NextResponse, type NextRequest } from "next/server";

import { generateDailySummary, generateWeeklySummary } from "@/lib/ai/summarizer";
import { getUserFromTelegramData } from "@/lib/telegram/auth";

/**
 * POST /api/summaries/generate
 *
 * Генерация саммари для пользователя
 * Поддерживает аутентификацию через Telegram Mini App (X-Telegram-Init-Data)
 */
export async function POST(req: NextRequest) {
  try {
    // Проверяем Telegram аутентификацию
    const initData = req.headers.get("X-Telegram-Init-Data");

    if (!initData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserFromTelegramData(initData);

    if (!user) {
      return NextResponse.json({ error: "Invalid Telegram data" }, { status: 401 });
    }

    // Получаем параметры из body
    const body = await req.json().catch(() => ({}));
    const { type = "daily" } = body;

    // Генерируем саммари
    let summary;

    if (type === "weekly") {
      summary = await generateWeeklySummary(user.id);
    } else {
      summary = await generateDailySummary(user.id);
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
