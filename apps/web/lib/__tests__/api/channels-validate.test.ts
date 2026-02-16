import { type NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/lib/auth";
import { ParseError, ParseErrorCode, validateAndGetSourceInfo } from "@/lib/parsers";
import { POST } from "@/app/api/channels/validate/route";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/parsers", () => ({
  validateAndGetSourceInfo: vi.fn(),
  ParseError: class ParseError extends Error {
    source: string;
    code: string;
    constructor(message: string, source: string, code: string) {
      super(message);
      this.source = source;
      this.code = code;
      this.name = "ParseError";
    }
  },
}));

function createMockRequest(body: unknown): NextRequest {
  return {
    json: async () => body,
  } as NextRequest;
}

// Helper to create mock session
function mockSession(userId: string, email: string) {
  return {
    user: { id: userId, email },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };
}

describe("POST /api/channels/validate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when user is not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const request = createMockRequest({ url: "https://t.me/example" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when URL is missing", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession("user-1", "test@example.com") as never);

    const request = createMockRequest({});
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("URL is required");
  });

  it("should return 400 when URL is not a string", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession("user-1", "test@example.com") as never);

    const request = createMockRequest({ url: 12345 });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("URL is required");
  });

  it("should return valid channel info for Telegram channel", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession("user-1", "test@example.com") as never);

    vi.mocked(validateAndGetSourceInfo).mockResolvedValue({
      type: "telegram",
      info: {
        name: "Tech News",
        description: "Latest tech news",
        url: "https://t.me/technews",
        imageUrl: "https://example.com/image.jpg",
        subscribersCount: 10000,
      },
    });

    const request = createMockRequest({ url: "https://t.me/technews" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.valid).toBe(true);
    expect(data.type).toBe("telegram");
    expect(data.name).toBe("Tech News");
    expect(data.description).toBe("Latest tech news");
    expect(data.imageUrl).toBe("https://example.com/image.jpg");
    expect(data.subscribersCount).toBe(10000);
  });

  it("should return valid channel info for RSS feed", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession("user-1", "test@example.com") as never);

    vi.mocked(validateAndGetSourceInfo).mockResolvedValue({
      type: "rss",
      info: {
        name: "Hacker News",
        description: "Tech news and discussion",
        url: "https://news.ycombinator.com/rss",
        imageUrl: null,
        subscribersCount: undefined,
      },
    });

    const request = createMockRequest({ url: "https://news.ycombinator.com/rss" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.valid).toBe(true);
    expect(data.type).toBe("rss");
    expect(data.name).toBe("Hacker News");
  });

  it("should return 400 with ParseError details for invalid channel", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession("user-1", "test@example.com") as never);

    const parseError = new ParseError(
      "Channel not found",
      "telegram",
      ParseErrorCode.SOURCE_NOT_FOUND
    );
    vi.mocked(validateAndGetSourceInfo).mockRejectedValue(parseError);

    const request = createMockRequest({ url: "https://t.me/nonexistent" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.valid).toBe(false);
    expect(data.error).toBe("Channel not found");
    expect(data.code).toBe("CHANNEL_NOT_FOUND");
  });

  it("should return 500 for unexpected errors", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession("user-1", "test@example.com") as never);

    vi.mocked(validateAndGetSourceInfo).mockRejectedValue(new Error("Network error"));

    const request = createMockRequest({ url: "https://t.me/example" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.valid).toBe(false);
    expect(data.error).toBe("Internal server error");
  });
});
