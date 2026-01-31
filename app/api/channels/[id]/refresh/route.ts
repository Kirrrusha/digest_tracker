import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchAndSaveChannelPosts, ParseError } from "@/lib/parsers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/channels/[id]/refresh - Обновление постов канала
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: channelId } = await context.params;

    // Проверяем, что канал принадлежит пользователю
    const channel = await db.channel.findFirst({
      where: {
        id: channelId,
        userId: session.user.id,
      },
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const result = await fetchAndSaveChannelPosts(channelId);

    return NextResponse.json({
      added: result.added,
      skipped: result.skipped,
      channelId,
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof ParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    console.error("Error refreshing channel:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
