import { describe, expect, it } from "vitest";

import { parserFactory, ParseError, ParseErrorCode } from "@/lib/parsers";

describe("ParserFactory", () => {
  describe("getParser", () => {
    it("should return telegram parser for telegram type", () => {
      const parser = parserFactory.getParser("telegram");
      expect(parser).not.toBeNull();
      expect(parser?.type).toBe("telegram");
    });

    it("should return rss parser for rss type", () => {
      const parser = parserFactory.getParser("rss");
      expect(parser).not.toBeNull();
      expect(parser?.type).toBe("rss");
    });

    it("should return null for unknown type", () => {
      // @ts-expect-error - testing invalid type
      const parser = parserFactory.getParser("unknown");
      expect(parser).toBeNull();
    });
  });

  describe("getParserForUrl", () => {
    it("should return telegram parser for Telegram URLs", () => {
      const parser = parserFactory.getParserForUrl("https://t.me/durov");
      expect(parser?.type).toBe("telegram");
    });

    it("should return telegram parser for @ usernames", () => {
      const parser = parserFactory.getParserForUrl("@durov");
      expect(parser?.type).toBe("telegram");
    });

    it("should return rss parser for RSS URLs", () => {
      const parser = parserFactory.getParserForUrl("https://example.com/feed");
      expect(parser?.type).toBe("rss");
    });

    it("should return null for unsupported URLs", () => {
      const parser = parserFactory.getParserForUrl("https://example.com");
      expect(parser).toBeNull();
    });
  });

  describe("detectSourceType", () => {
    it("should detect telegram type", () => {
      expect(parserFactory.detectSourceType("https://t.me/durov")).toBe("telegram");
      expect(parserFactory.detectSourceType("@durov")).toBe("telegram");
    });

    it("should detect rss type", () => {
      expect(parserFactory.detectSourceType("https://example.com/feed")).toBe("rss");
      expect(parserFactory.detectSourceType("https://example.com/rss.xml")).toBe("rss");
    });

    it("should return null for unsupported URLs", () => {
      expect(parserFactory.detectSourceType("https://example.com")).toBeNull();
    });
  });

  describe("isValidSource", () => {
    it("should return true for valid sources", () => {
      expect(parserFactory.isValidSource("https://t.me/durov")).toBe(true);
      expect(parserFactory.isValidSource("https://example.com/feed")).toBe(true);
    });

    it("should return false for invalid sources", () => {
      expect(parserFactory.isValidSource("https://example.com")).toBe(false);
      expect(parserFactory.isValidSource("invalid")).toBe(false);
    });
  });
});

describe("ParseError re-export", () => {
  it("should be available from index", () => {
    const error = new ParseError("test", "source", ParseErrorCode.INVALID_URL);
    expect(error).toBeInstanceOf(ParseError);
  });
});
