import { type NextRequest, NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth/mobile";
import { db } from "@/lib/db";

/**
 * GET /api/summaries
 * Query params: type (daily|weekly), page, limit
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "daily" | "weekly"
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(type ? { period: { startsWith: type } } : {}),
    };

    const [summaries, total] = await Promise.all([
      db.summary.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          content: true,
          period: true,
          topics: true,
          createdAt: true,
          _count: { select: { posts: true } },
        },
      }),
      db.summary.count({ where }),
    ]);

    const result = summaries.map((s) => ({
      id: s.id,
      title: s.title,
      content: s.content,
      period: s.period,
      topics: s.topics,
      postsCount: s._count.posts,
      createdAt: s.createdAt,
    }));

    return NextResponse.json({
      summaries: result,
      total,
      page,
      hasMore: skip + summaries.length < total,
    });
  } catch (error) {
    console.error("[GET /api/summaries]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
