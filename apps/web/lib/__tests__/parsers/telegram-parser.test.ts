import { describe, expect, it } from "vitest";

import {
  extractTelegramUsername,
  isValidTelegramUrl,
  telegramParser,
} from "@/lib/parsers/telegram-parser";

describe("TelegramParser", () => {
  describe("isValidSource", () => {
    it("should return true for valid t.me URLs", () => {
      expect(telegramParser.isValidSource("https://t.me/durov")).toBe(true);
      expect(telegramParser.isValidSource("https://t.me/telegram")).toBe(true);
      expect(telegramParser.isValidSource("https://t.me/test_channel")).toBe(true);
      expect(telegramParser.isValidSource("t.me/durov")).toBe(true);
    });

    it("should return true for valid telegram.me URLs", () => {
      expect(telegramParser.isValidSource("https://telegram.me/durov")).toBe(true);
    });

    it("should return true for @ usernames", () => {
      expect(telegramParser.isValidSource("@durov")).toBe(true);
      expect(telegramParser.isValidSource("@test_channel")).toBe(true);
      expect(telegramParser.isValidSource("@Test123")).toBe(true);
    });

    it("should return false for invalid URLs", () => {
      expect(telegramParser.isValidSource("https://example.com")).toBe(false);
      expect(telegramParser.isValidSource("https://t.me/")).toBe(false);
      expect(telegramParser.isValidSource("@ab")).toBe(false); // too short
      expect(telegramParser.isValidSource("@123abc")).toBe(false); // starts with number
      expect(telegramParser.isValidSource("invalid")).toBe(false);
    });

    it("should handle URLs with /s/ prefix", () => {
      expect(telegramParser.isValidSource("https://t.me/s/durov")).toBe(true);
    });
  });

  describe("type", () => {
    it("should be telegram", () => {
      expect(telegramParser.type).toBe("telegram");
    });
  });
});

describe("isValidTelegramUrl", () => {
  it("should work as standalone function", () => {
    expect(isValidTelegramUrl("https://t.me/durov")).toBe(true);
    expect(isValidTelegramUrl("@durov")).toBe(true);
    expect(isValidTelegramUrl("https://example.com")).toBe(false);
  });
});

describe("extractTelegramUsername", () => {
  it("should extract username from t.me URL", () => {
    expect(extractTelegramUsername("https://t.me/durov")).toBe("durov");
    expect(extractTelegramUsername("https://t.me/s/durov")).toBe("durov");
    expect(extractTelegramUsername("t.me/telegram")).toBe("telegram");
  });

  it("should extract username from @ format", () => {
    expect(extractTelegramUsername("@durov")).toBe("durov");
    expect(extractTelegramUsername("@test_channel")).toBe("test_channel");
  });

  it("should return null for invalid input", () => {
    expect(extractTelegramUsername("invalid")).toBe(null);
    expect(extractTelegramUsername("")).toBe(null);
  });
});
