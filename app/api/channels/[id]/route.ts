import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/channels/[id] - Получение информации о канале
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const channel = await db.channel.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
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
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("Error getting channel:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/channels/[id] - Обновление канала
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { name, isActive } = body;

    // Проверяем, что канал принадлежит пользователю
    const channel = await db.channel.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const updateData: { name?: string; isActive?: boolean } = {};
    if (typeof name === "string" && name.trim()) {
      updateData.name = name.trim();
    }
    if (typeof isActive === "boolean") {
      updateData.isActive = isActive;
    }

    const updated = await db.channel.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      sourceUrl: updated.sourceUrl,
      sourceType: updated.sourceType,
      description: updated.description,
      imageUrl: updated.imageUrl,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error("Error updating channel:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/channels/[id] - Удаление канала
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    // Проверяем, что канал принадлежит пользователю
    const channel = await db.channel.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Удаляем канал (посты удалятся каскадно)
    await db.channel.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting channel:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
