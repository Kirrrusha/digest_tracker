import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { getSessionUserId } from "@/lib/auth/mobile";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/channels/[id]/posts - Получение постов канала
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: channelId } = await context.params;
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    // Проверяем, что канал принадлежит пользователю
    const channel = await db.channel.findFirst({
      where: {
        id: channelId,
        userId: userId,
      },
      select: { id: true, name: true },
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const [posts, total] = await Promise.all([
      db.post.findMany({
        where: { channelId },
        orderBy: { publishedAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          externalId: true,
          title: true,
          contentPreview: true,
          url: true,
          author: true,
          publishedAt: true,
          createdAt: true,
        },
      }),
      db.post.count({ where: { channelId } }),
    ]);

    return NextResponse.json({
      data: posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error getting channel posts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
