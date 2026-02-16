import { NextResponse } from "next/server";

import { checkRedisConnection } from "@/lib/cache/redis";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

interface ServiceStatus {
  status: "healthy" | "unhealthy";
  latencyMs?: number;
  error?: string;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  uptime: number;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
  };
}

const startTime = Date.now();

/**
 * GET /api/health - Health check endpoint
 */
export async function GET() {
  const timestamp = new Date().toISOString();
  const uptime = Math.round((Date.now() - startTime) / 1000);
  const version = process.env.npm_package_version || "1.0.0";

  // Проверяем все сервисы параллельно
  const [dbStatus, redisStatus] = await Promise.all([checkDatabase(), checkRedis()]);

  const services = {
    database: dbStatus,
    redis: redisStatus,
  };

  // Определяем общий статус
  const allHealthy = Object.values(services).every((s) => s.status === "healthy");
  const allUnhealthy = Object.values(services).every((s) => s.status === "unhealthy");

  let status: HealthResponse["status"];
  if (allHealthy) {
    status = "healthy";
  } else if (allUnhealthy) {
    status = "unhealthy";
  } else {
    status = "degraded";
  }

  const response: HealthResponse = {
    status,
    timestamp,
    version,
    uptime,
    services,
  };

  // Логируем если не все сервисы здоровы
  if (status !== "healthy") {
    logger.warn("Health check degraded", { status, services });
  }

  const httpStatus = status === "unhealthy" ? 503 : 200;
  return NextResponse.json(response, { status: httpStatus });
}

async function checkDatabase(): Promise<ServiceStatus> {
  try {
    const start = performance.now();
    await db.$queryRaw`SELECT 1`;
    const latencyMs = Math.round(performance.now() - start);

    return { status: "healthy", latencyMs };
  } catch (error) {
    return {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkRedis(): Promise<ServiceStatus> {
  const result = await checkRedisConnection();

  if (result.connected) {
    return { status: "healthy", latencyMs: result.latencyMs };
  }

  // Redis недоступен, но это не критично (graceful degradation)
  return {
    status: result.error === "Redis URL not configured" ? "healthy" : "unhealthy",
    error: result.error,
  };
}
