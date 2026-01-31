import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  db: {
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@/lib/cache/redis", () => ({
  checkRedisConnection: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { GET } from "@/app/api/health/route";
import { db } from "@/lib/db";
import { checkRedisConnection } from "@/lib/cache/redis";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return healthy status when all services are up", async () => {
    vi.mocked(db.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);
    vi.mocked(checkRedisConnection).mockResolvedValue({
      connected: true,
      latencyMs: 5,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("healthy");
    expect(data.services.database.status).toBe("healthy");
    expect(data.services.redis.status).toBe("healthy");
    expect(data.timestamp).toBeDefined();
    expect(data.uptime).toBeGreaterThanOrEqual(0);
    expect(data.version).toBeDefined();
  });

  it("should return degraded status when Redis is down but DB is up", async () => {
    vi.mocked(db.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);
    vi.mocked(checkRedisConnection).mockResolvedValue({
      connected: false,
      error: "Connection refused",
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("degraded");
    expect(data.services.database.status).toBe("healthy");
    expect(data.services.redis.status).toBe("unhealthy");
  });

  it("should return degraded status when DB is down but Redis is up", async () => {
    vi.mocked(db.$queryRaw).mockRejectedValue(new Error("Connection failed"));
    vi.mocked(checkRedisConnection).mockResolvedValue({
      connected: true,
      latencyMs: 3,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("degraded");
    expect(data.services.database.status).toBe("unhealthy");
    expect(data.services.database.error).toBe("Connection failed");
    expect(data.services.redis.status).toBe("healthy");
  });

  it("should return unhealthy status with 503 when all services are down", async () => {
    vi.mocked(db.$queryRaw).mockRejectedValue(new Error("DB down"));
    vi.mocked(checkRedisConnection).mockResolvedValue({
      connected: false,
      error: "Redis down",
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe("unhealthy");
    expect(data.services.database.status).toBe("unhealthy");
    expect(data.services.redis.status).toBe("unhealthy");
  });

  it("should treat unconfigured Redis as healthy", async () => {
    vi.mocked(db.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);
    vi.mocked(checkRedisConnection).mockResolvedValue({
      connected: false,
      error: "Redis URL not configured",
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("healthy");
    expect(data.services.redis.status).toBe("healthy");
  });

  it("should include latency measurements for healthy services", async () => {
    vi.mocked(db.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);
    vi.mocked(checkRedisConnection).mockResolvedValue({
      connected: true,
      latencyMs: 10,
    });

    const response = await GET();
    const data = await response.json();

    expect(data.services.database.latencyMs).toBeDefined();
    expect(typeof data.services.database.latencyMs).toBe("number");
    expect(data.services.redis.latencyMs).toBe(10);
  });
});
