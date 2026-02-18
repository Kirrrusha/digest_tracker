import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getSessionUserId } from "@/lib/auth/mobile";
import { db } from "@/lib/db";

const updateSchema = z.object({
  topics: z.array(z.string()).optional(),
  summaryInterval: z.string().optional(),
  language: z.string().optional(),
  notificationsEnabled: z.boolean().optional(),
  telegramNotifications: z.boolean().optional(),
  notifyOnNewSummary: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preferences = await db.userPreferences.findUnique({ where: { userId } });

    if (!preferences) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error("[GET /api/preferences]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getSessionUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const preferences = await db.userPreferences.upsert({
      where: { userId },
      update: parsed.data,
      create: { userId, ...parsed.data },
    });

    return NextResponse.json(preferences);
  } catch (error) {
    console.error("[PATCH /api/preferences]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
