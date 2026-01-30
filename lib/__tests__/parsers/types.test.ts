import { describe, expect, it } from "vitest";

import { ParseError, ParseErrorCode } from "@/lib/parsers/types";

describe("ParseError", () => {
  it("should create error with message, source and code", () => {
    const error = new ParseError(
      "Test error message",
      "https://example.com",
      ParseErrorCode.INVALID_URL
    );

    expect(error.message).toBe("Test error message");
    expect(error.source).toBe("https://example.com");
    expect(error.code).toBe(ParseErrorCode.INVALID_URL);
    expect(error.name).toBe("ParseError");
  });

  it("should be instanceof Error", () => {
    const error = new ParseError(
      "Test",
      "https://example.com",
      ParseErrorCode.NETWORK_ERROR
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ParseError);
  });
});

describe("ParseErrorCode", () => {
  it("should have all required error codes", () => {
    expect(ParseErrorCode.INVALID_URL).toBe("INVALID_URL");
    expect(ParseErrorCode.SOURCE_NOT_FOUND).toBe("SOURCE_NOT_FOUND");
    expect(ParseErrorCode.ACCESS_DENIED).toBe("ACCESS_DENIED");
    expect(ParseErrorCode.RATE_LIMITED).toBe("RATE_LIMITED");
    expect(ParseErrorCode.PARSE_FAILED).toBe("PARSE_FAILED");
    expect(ParseErrorCode.NETWORK_ERROR).toBe("NETWORK_ERROR");
    expect(ParseErrorCode.UNKNOWN).toBe("UNKNOWN");
  });
});
