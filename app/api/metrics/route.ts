import { NextResponse } from "next/server";

import { getAllMetrics, getRecentRequests, getSummaryStats } from "@/lib/metrics";

/**
 * GET /api/metrics - Получение метрик приложения
 *
 * Доступен только в development или с API ключом
 */
export async function GET(request: Request) {
  // Проверка доступа
  const isDevMode = process.env.NODE_ENV === "development";
  const apiKey = request.headers.get("x-api-key");
  const expectedKey = process.env.METRICS_API_KEY;

  if (!isDevMode && apiKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const detailed = url.searchParams.get("detailed") === "true";

  const summary = getSummaryStats();

  const response: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    summary,
  };

  if (detailed) {
    response.metrics = getAllMetrics();
    response.recentRequests = getRecentRequests().slice(0, 20);
  }

  return NextResponse.json(response);
}
