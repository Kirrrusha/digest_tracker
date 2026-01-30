import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Mock node-cron
vi.mock("node-cron", () => ({
  default: {
    schedule: vi.fn(),
  },
}));

// Mock database
vi.mock("@/lib/db", () => ({
  db: {
    channel: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
    post: { count: vi.fn() },
    summary: { findFirst: vi.fn() },
  },
}));

// Mock parsers
vi.mock("@/lib/parsers", () => ({
  fetchAndSaveChannelPosts: vi.fn(),
}));

// Mock AI
vi.mock("@/lib/ai/summarizer", () => ({
  generateDailySummary: vi.fn(),
  generateWeeklySummary: vi.fn(),
}));

describe("Cron Scheduler", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.ENABLE_CRON = "false";
  });

  afterEach(() => {
    delete process.env.ENABLE_CRON;
  });

  describe("initCronJobs", () => {
    it("should not initialize when ENABLE_CRON is not true", async () => {
      const cron = await import("node-cron");
      const { initCronJobs } = await import("@/lib/cron/scheduler");

      process.env.ENABLE_CRON = "false";
      initCronJobs();

      expect(cron.default.schedule).not.toHaveBeenCalled();
    });

    it("should initialize cron jobs when ENABLE_CRON is true", async () => {
      const cron = await import("node-cron");
      const { initCronJobs } = await import("@/lib/cron/scheduler");

      process.env.ENABLE_CRON = "true";
      initCronJobs();

      // Should schedule 3 jobs: fetch-posts, daily-summary, weekly-summary
      expect(cron.default.schedule).toHaveBeenCalledTimes(3);
    });

    it("should not initialize twice", async () => {
      const cron = await import("node-cron");
      const { initCronJobs } = await import("@/lib/cron/scheduler");

      process.env.ENABLE_CRON = "true";
      initCronJobs();
      initCronJobs(); // Second call should be ignored

      expect(cron.default.schedule).toHaveBeenCalledTimes(3);
    });
  });

  describe("cronJobs export", () => {
    it("should export job functions", async () => {
      const { cronJobs } = await import("@/lib/cron/scheduler");

      expect(cronJobs.fetchAllPosts).toBeDefined();
      expect(cronJobs.generateDailySummaries).toBeDefined();
      expect(cronJobs.generateWeeklySummaries).toBeDefined();
      expect(typeof cronJobs.fetchAllPosts).toBe("function");
      expect(typeof cronJobs.generateDailySummaries).toBe("function");
      expect(typeof cronJobs.generateWeeklySummaries).toBe("function");
    });
  });
});
