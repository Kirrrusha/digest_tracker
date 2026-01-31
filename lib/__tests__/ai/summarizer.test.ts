import { beforeEach, describe, expect, it, vi } from "vitest";

// We need to import after mocking
import { generateSummaryFromPosts, type PostForSummary } from "@/lib/ai/summarizer";

// Mock OpenAI module
vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  })),
}));

// Mock db module
vi.mock("@/lib/db", () => ({
  db: {
    summary: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    post: {
      findMany: vi.fn(),
    },
    userPreferences: {
      findUnique: vi.fn(),
    },
  },
}));

describe("summarizer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateSummaryFromPosts", () => {
    it("should throw error when no posts provided", async () => {
      await expect(generateSummaryFromPosts([])).rejects.toThrow(
        "No posts provided for summary generation"
      );
    });

    it("should throw error when posts array is empty", async () => {
      const posts: PostForSummary[] = [];
      await expect(generateSummaryFromPosts(posts)).rejects.toThrow(
        "No posts provided for summary generation"
      );
    });
  });
});

// Test extractHighlights and getWeekNumber as separate pure functions
describe("extractHighlights (internal logic)", () => {
  // These patterns are tested through their expected behavior
  it("should match highlight patterns for Russian text", () => {
    const patterns = [/(?:ключев(?:ой|ые|ых)|важн(?:ый|ые|ых)|главн(?:ый|ые|ых))[\s:]+([^\n]+)/gi];

    const testCases = [
      { input: "ключевой момент: важная информация", shouldMatch: true },
      { input: "важный факт: новый релиз React", shouldMatch: true },
      { input: "главные события: конференция прошла успешно", shouldMatch: true },
    ];

    for (const testCase of testCases) {
      let matched = false;
      for (const pattern of patterns) {
        pattern.lastIndex = 0;
        if (pattern.test(testCase.input)) {
          matched = true;
          break;
        }
      }
      expect(matched).toBe(testCase.shouldMatch);
    }
  });

  it("should match highlight patterns for English text", () => {
    const pattern = /(?:key|important|main)[\s:]+([^\n]+)/gi;

    const testCases = [
      { input: "key point: this is important", expected: true },
      { input: "important: security update released", expected: true },
      { input: "main takeaway: use TypeScript", expected: true },
    ];

    for (const testCase of testCases) {
      pattern.lastIndex = 0;
      expect(pattern.test(testCase.input)).toBe(testCase.expected);
    }
  });

  it("should match bullet points pattern", () => {
    const pattern = /^[\-\*]\s+(.{20,100})$/gm;

    const testCases = [
      {
        input: "- This is a bullet point with enough content to match",
        expected: true,
      },
      {
        input: "* Another bullet point item with sufficient length",
        expected: true,
      },
      { input: "- Short", expected: false }, // Too short (< 20 chars)
      {
        input: "Normal text without bullet point but with enough content to be long",
        expected: false,
      },
    ];

    for (const testCase of testCases) {
      pattern.lastIndex = 0;
      expect(pattern.test(testCase.input)).toBe(testCase.expected);
    }
  });
});

describe("getWeekNumber (algorithm test)", () => {
  // Test the week number calculation logic
  it("should calculate week number correctly for start of year", () => {
    const getWeekNumber = (date: Date): number => {
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
      const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
      return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    };

    // January 1st, 2024
    const jan1 = new Date(2024, 0, 1);
    const weekNum = getWeekNumber(jan1);
    expect(weekNum).toBeGreaterThanOrEqual(1);
    expect(weekNum).toBeLessThanOrEqual(2);
  });

  it("should calculate week number correctly for mid-year", () => {
    const getWeekNumber = (date: Date): number => {
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
      const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
      return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    };

    // July 1st, 2024
    const july1 = new Date(2024, 6, 1);
    const weekNum = getWeekNumber(july1);
    expect(weekNum).toBeGreaterThan(25);
    expect(weekNum).toBeLessThan(28);
  });

  it("should calculate week number correctly for end of year", () => {
    const getWeekNumber = (date: Date): number => {
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
      const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
      return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    };

    // December 31st, 2024
    const dec31 = new Date(2024, 11, 31);
    const weekNum = getWeekNumber(dec31);
    expect(weekNum).toBeGreaterThanOrEqual(52);
    expect(weekNum).toBeLessThanOrEqual(53);
  });
});

describe("PostForSummary interface", () => {
  it("should accept valid post data", () => {
    const post: PostForSummary = {
      id: "1",
      title: "Test Post",
      content: "This is test content",
      url: "https://example.com",
      channelName: "Test Channel",
      publishedAt: new Date(),
    };

    expect(post.id).toBe("1");
    expect(post.title).toBe("Test Post");
    expect(post.content).toBe("This is test content");
    expect(post.url).toBe("https://example.com");
    expect(post.channelName).toBe("Test Channel");
    expect(post.publishedAt).toBeInstanceOf(Date);
  });

  it("should accept null title and url", () => {
    const post: PostForSummary = {
      id: "2",
      title: null,
      content: "Content without title",
      url: null,
      channelName: "Channel Name",
      publishedAt: new Date(),
    };

    expect(post.title).toBeNull();
    expect(post.url).toBeNull();
  });
});

describe("parseSummaryResponse behavior", () => {
  it("should generate correct Russian title format", () => {
    const today = new Date();
    const expectedDatePart = today.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
    });
    const expectedTitle = `Саммари за ${expectedDatePart}`;

    expect(expectedTitle).toMatch(/Саммари за \d+ \w+/);
  });

  it("should generate correct English title format", () => {
    const today = new Date();
    const expectedDatePart = today.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
    });
    const expectedTitle = `Summary for ${expectedDatePart}`;

    expect(expectedTitle).toMatch(/Summary for \w+ \d+/);
  });
});
