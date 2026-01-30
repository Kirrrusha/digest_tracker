import { NextResponse } from "next/server";

import { db } from "@/lib/db";

/**
 * GET /api/health - Health check endpoint
 */
export async function GET() {
  try {
    // Проверяем подключение к БД
    await db.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
