import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchAndSaveChannelPosts } from "@/lib/parsers";

/**
 * POST /api/channels/refresh - Обновление всех каналов пользователя
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const channels = await db.channel.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
    });

    const results: Array<{
      channelId: string;
      channelName: string;
      added: number;
      skipped: number;
      error?: string;
    }> = [];

    let totalAdded = 0;
    let totalSkipped = 0;
    const errors: string[] = [];

    for (const channel of channels) {
      try {
        const result = await fetchAndSaveChannelPosts(channel.id);
        totalAdded += result.added;
        totalSkipped += result.skipped;
        results.push({
          channelId: channel.id,
          channelName: channel.name,
          added: result.added,
          skipped: result.skipped,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        errors.push(`${channel.name}: ${message}`);
        results.push({
          channelId: channel.id,
          channelName: channel.name,
          added: 0,
          skipped: 0,
          error: message,
        });
      }
    }

    return NextResponse.json({
      totalAdded,
      totalSkipped,
      channelsProcessed: channels.length,
      errors,
      results,
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error refreshing all channels:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
