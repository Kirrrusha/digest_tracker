import { NextResponse, type NextRequest } from "next/server";

import { getSessionUserId } from "@/lib/auth/mobile";
import { db } from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const summary = await db.summary.findFirst({
      where: { id, userId },
      include: { _count: { select: { posts: true } } },
    });

    if (!summary) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: summary.id,
      title: summary.title,
      content: summary.content,
      period: summary.period,
      topics: summary.topics,
      postsCount: summary._count.posts,
      createdAt: summary.createdAt,
    });
  } catch (error) {
    console.error("[GET /api/summaries/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const summary = await db.summary.findFirst({ where: { id, userId } });

    if (!summary) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.summary.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/summaries/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
