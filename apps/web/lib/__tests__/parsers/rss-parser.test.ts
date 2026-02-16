import { describe, expect, it } from "vitest";

import { isValidRSSUrl, rssParser } from "@/lib/parsers/rss-parser";

describe("RSSParser", () => {
  describe("isValidSource", () => {
    it("should return true for URLs containing /feed", () => {
      expect(rssParser.isValidSource("https://example.com/feed")).toBe(true);
      expect(rssParser.isValidSource("https://example.com/feed/")).toBe(true);
      expect(rssParser.isValidSource("https://blog.example.com/feed.xml")).toBe(true);
    });

    it("should return true for URLs containing /rss", () => {
      expect(rssParser.isValidSource("https://example.com/rss")).toBe(true);
      expect(rssParser.isValidSource("https://example.com/rss.xml")).toBe(true);
    });

    it("should return true for URLs ending with .xml", () => {
      expect(rssParser.isValidSource("https://example.com/blog.xml")).toBe(true);
    });

    it("should return true for URLs containing atom", () => {
      expect(rssParser.isValidSource("https://example.com/atom.xml")).toBe(true);
      expect(rssParser.isValidSource("https://example.com/atom")).toBe(true);
    });

    it("should return true for URLs containing /feeds/", () => {
      expect(rssParser.isValidSource("https://example.com/feeds/posts")).toBe(true);
    });

    it("should return false for non-RSS URLs", () => {
      expect(rssParser.isValidSource("https://example.com")).toBe(false);
      expect(rssParser.isValidSource("https://example.com/blog")).toBe(false);
      expect(rssParser.isValidSource("https://t.me/channel")).toBe(false);
    });

    it("should return false for invalid URLs", () => {
      expect(rssParser.isValidSource("not a url")).toBe(false);
      expect(rssParser.isValidSource("")).toBe(false);
    });

    it("should require http or https protocol", () => {
      expect(rssParser.isValidSource("ftp://example.com/feed")).toBe(false);
    });
  });

  describe("type", () => {
    it("should be rss", () => {
      expect(rssParser.type).toBe("rss");
    });
  });
});

describe("isValidRSSUrl", () => {
  it("should work as standalone function", () => {
    expect(isValidRSSUrl("https://example.com/feed")).toBe(true);
    expect(isValidRSSUrl("https://example.com/rss.xml")).toBe(true);
    expect(isValidRSSUrl("https://example.com")).toBe(false);
  });
});
