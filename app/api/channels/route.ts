import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchAndSaveChannelPosts, ParseError, validateAndGetSourceInfo } from "@/lib/parsers";

/**
 * GET /api/channels - Получение списка каналов пользователя
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const channels = await db.channel.findMany({
      where: { userId: session.user.id },
      include: {
        _count: {
          select: { posts: true },
        },
        posts: {
          orderBy: { publishedAt: "desc" },
          take: 1,
          select: { publishedAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = channels.map((channel) => ({
      id: channel.id,
      name: channel.name,
      sourceUrl: channel.sourceUrl,
      sourceType: channel.sourceType,
      description: channel.description,
      imageUrl: channel.imageUrl,
      isActive: channel.isActive,
      postsCount: channel._count.posts,
      lastPostAt: channel.posts[0]?.publishedAt || null,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error getting channels:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/channels - Добавление нового канала
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Валидируем URL и получаем информацию о канале
    const { type, info } = await validateAndGetSourceInfo(url);

    // Проверяем, не добавлен ли уже этот канал
    const existing = await db.channel.findFirst({
      where: {
        userId: session.user.id,
        sourceUrl: info.url,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Channel already exists", code: "CHANNEL_EXISTS" },
        { status: 409 }
      );
    }

    // Создаём канал
    const channel = await db.channel.create({
      data: {
        userId: session.user.id,
        name: info.name,
        sourceUrl: info.url,
        sourceType: type,
        description: info.description,
        imageUrl: info.imageUrl,
        isActive: true,
      },
    });

    // Сразу загружаем последние посты
    let postsCount = 0;
    try {
      const result = await fetchAndSaveChannelPosts(channel.id, { limit: 20 });
      postsCount = result.added;
    } catch {
      console.error("Failed to fetch initial posts for channel:", channel.id);
    }

    return NextResponse.json(
      {
        id: channel.id,
        name: channel.name,
        sourceUrl: channel.sourceUrl,
        sourceType: channel.sourceType,
        description: channel.description,
        imageUrl: channel.imageUrl,
        isActive: channel.isActive,
        postsCount,
        createdAt: channel.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ParseError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    console.error("Error adding channel:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
