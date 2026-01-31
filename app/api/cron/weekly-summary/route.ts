import { NextResponse } from "next/server";

import { generateWeeklySummary } from "@/lib/ai/summarizer";
import { db } from "@/lib/db";

/**
 * GET /api/cron/weekly-summary
 * Генерация недельных саммари для всех пользователей с настройкой "weekly"
 * Вызывается по расписанию (например, в воскресенье в 20:00)
 */
export async function GET(request: Request) {
  try {
    // Проверка авторизации для cron
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Получаем пользователей с недельными саммари
    const users = await db.user.findMany({
      where: {
        preferences: {
          summaryInterval: "weekly",
        },
        channels: {
          some: { isActive: true },
        },
      },
      select: {
        id: true,
        email: true,
        preferences: {
          select: {
            notificationsEnabled: true,
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
        // Проверяем, есть ли посты за неделю
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const postsCount = await db.post.count({
          where: {
            channel: { userId: user.id },
            publishedAt: { gte: weekAgo },
          },
        });

        if (postsCount === 0) {
          results.push({
            userId: user.id,
            success: false,
            error: "No posts this week",
          });
          continue;
        }

        const summary = await generateWeeklySummary(user.id);

        results.push({
          userId: user.id,
          success: true,
          summaryId: summary.id,
        });
      } catch (error) {
        results.push({
          userId: user.id,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const skippedCount = results.filter((r) => r.error?.includes("No posts")).length;
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
    console.error("Cron weekly-summary error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
