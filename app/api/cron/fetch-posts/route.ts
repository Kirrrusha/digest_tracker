import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { fetchAndSaveChannelPosts } from "@/lib/parsers";

/**
 * GET /api/cron/fetch-posts
 * Фетчинг новых постов из всех активных каналов
 * Вызывается по расписанию (например, каждые 6 часов)
 */
export async function GET(request: Request) {
  try {
    // Проверка авторизации для cron
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Получаем все активные каналы
    const channels = await db.channel.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        sourceUrl: true,
        sourceType: true,
        userId: true,
      },
    });

    const results: Array<{
      channelId: string;
      channelName: string;
      success: boolean;
      added: number;
      skipped: number;
      error?: string;
    }> = [];

    let totalAdded = 0;
    let totalSkipped = 0;

    for (const channel of channels) {
      try {
        const result = await fetchAndSaveChannelPosts(channel.id);
        totalAdded += result.added;
        totalSkipped += result.skipped;

        results.push({
          channelId: channel.id,
          channelName: channel.name,
          success: true,
          added: result.added,
          skipped: result.skipped,
        });
      } catch (error) {
        results.push({
          channelId: channel.id,
          channelName: channel.name,
          success: false,
          added: 0,
          skipped: 0,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const errorCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      processed: channels.length,
      successful: successCount,
      failed: errorCount,
      totalAdded,
      totalSkipped,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron fetch-posts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
