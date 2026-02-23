import { NextResponse } from "next/server";

import { generateDailySummary } from "@/lib/ai/summarizer";
import { db } from "@/lib/db";

/**
 * GET /api/cron/daily-summary
 * Генерация дневных саммари для всех пользователей с настройкой "daily"
 * Вызывается по расписанию (например, в 20:00 каждый день)
 */
export async function GET(request: Request) {
  try {
    // Проверка авторизации для cron
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Получаем пользователей с дневными саммари
    const users = await db.user.findMany({
      where: {
        preferences: {
          summaryInterval: "daily",
        },
        channels: {
          some: { isActive: true },
        },
      },
      select: {
        id: true,
        preferences: {
          select: {
            notificationsEnabled: true,
            notificationTime: true,
          },
        },
      },
    });

    const results: Array<{
      userId: string;
      success: boolean;
      summaryId?: string;
      error?: string;
    }> = [];

    for (const user of users) {
      try {
        // Проверяем, есть ли посты за сегодня
        const postsCount = await db.post.count({
          where: {
            channel: { userId: user.id },
            publishedAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        });

        if (postsCount === 0) {
          results.push({
            userId: user.id,
            success: false,
            error: "No posts today",
          });
          continue;
        }

        // Проверяем, не был ли уже создан саммари сегодня
        const today = new Date().toISOString().split("T")[0];
        const existingSummary = await db.summary.findFirst({
          where: {
            userId: user.id,
            period: `daily-${today}`,
          },
        });

        if (existingSummary) {
          results.push({
            userId: user.id,
            success: true,
            summaryId: existingSummary.id,
            error: "Already exists",
          });
          continue;
        }

        const summary = await generateDailySummary(user.id);

        results.push({
          userId: user.id,
          success: true,
          summaryId: summary.id,
        });

        // TODO: Отправить уведомление если включено
        // if (user.preferences?.notificationsEnabled) {
        //   await sendNotification(user.id, summary.id);
        // }
      } catch (error) {
        results.push({
          userId: user.id,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success && !r.error?.includes("Already")).length;
    const skippedCount = results.filter(
      (r) => r.error?.includes("Already") || r.error?.includes("No posts")
    ).length;
    const errorCount = results.filter((r) => !r.success && !r.error?.includes("No posts")).length;

    return NextResponse.json({
      success: true,
      processed: users.length,
      generated: successCount,
      skipped: skippedCount,
      errors: errorCount,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron daily-summary error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
