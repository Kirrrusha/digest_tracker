import { type NextRequest, NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth/mobile";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [channelsCount, postsToday, summariesToday, latestSummary] = await Promise.all([
      db.channel.count({ where: { userId, isActive: true } }),
      db.post.count({
        where: { channel: { userId }, publishedAt: { gte: today } },
      }),
      db.summary.count({ where: { userId, createdAt: { gte: today } } }),
      db.summary.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          content: true,
          period: true,
          topics: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({ channelsCount, postsToday, summariesToday, latestSummary });
  } catch (error) {
    console.error("[GET /api/dashboard/stats]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
