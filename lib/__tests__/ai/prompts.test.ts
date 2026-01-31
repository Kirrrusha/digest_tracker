import { describe, expect, it } from "vitest";

import {
  buildPostSummaryPrompt,
  buildSummaryPrompt,
  buildTitlePrompt,
  buildTopicExtractionPrompt,
  SUMMARY_SYSTEM_PROMPT,
  SUMMARY_SYSTEM_PROMPT_EN,
} from "@/lib/ai/prompts";

describe("SUMMARY_SYSTEM_PROMPT", () => {
  it("should contain Russian instructions", () => {
    expect(SUMMARY_SYSTEM_PROMPT).toContain("эксперт");
    expect(SUMMARY_SYSTEM_PROMPT).toContain("программированию");
  });

  it("should contain markdown formatting rules", () => {
    expect(SUMMARY_SYSTEM_PROMPT).toContain("markdown");
  });

  it("should mention grouping by topics", () => {
    expect(SUMMARY_SYSTEM_PROMPT).toContain("темам");
  });
});

describe("SUMMARY_SYSTEM_PROMPT_EN", () => {
  it("should contain English instructions", () => {
    expect(SUMMARY_SYSTEM_PROMPT_EN).toContain("expert");
    expect(SUMMARY_SYSTEM_PROMPT_EN).toContain("programming");
  });

  it("should contain markdown formatting rules", () => {
    expect(SUMMARY_SYSTEM_PROMPT_EN).toContain("markdown");
  });
});

describe("buildSummaryPrompt", () => {
  const mockPosts = [
    {
      id: "1",
      title: "React 19 Release",
      content: "React 19 brings exciting new features for developers.",
      channelName: "Frontend News",
      url: "https://example.com/react19",
      publishedAt: new Date("2024-01-15"),
    },
    {
      id: "2",
      title: "TypeScript 5.4",
      content: "New TypeScript version released with improved type inference.",
      channelName: "TS News",
      url: null,
      publishedAt: new Date("2024-01-15"),
    },
  ];

  it("should include posts content in Russian by default", () => {
    const prompt = buildSummaryPrompt(mockPosts);
    expect(prompt).toContain("React 19 Release");
    expect(prompt).toContain("TypeScript 5.4");
    expect(prompt).toContain("Frontend News");
  });

  it("should generate Russian prompt by default", () => {
    const prompt = buildSummaryPrompt(mockPosts);
    expect(prompt).toContain("Проанализируй");
    expect(prompt).toContain("Основные темы дня");
  });

  it("should generate English prompt when specified", () => {
    const prompt = buildSummaryPrompt(mockPosts, "en");
    expect(prompt).toContain("Analyze");
    expect(prompt).toContain("Main topics of the day");
  });

  it("should include post URLs", () => {
    const prompt = buildSummaryPrompt(mockPosts);
    expect(prompt).toContain("https://example.com/react19");
  });

  it("should number posts", () => {
    const prompt = buildSummaryPrompt(mockPosts);
    expect(prompt).toContain("1.");
    expect(prompt).toContain("2.");
  });

  it("should include post count", () => {
    const prompt = buildSummaryPrompt(mockPosts);
    expect(prompt).toContain("2 постов");
  });
});

describe("buildTopicExtractionPrompt", () => {
  it("should generate Russian prompt by default", () => {
    const prompt = buildTopicExtractionPrompt("React и TypeScript");
    expect(prompt).toContain("Извлеки");
    expect(prompt).toContain("JSON");
  });

  it("should generate English prompt when specified", () => {
    const prompt = buildTopicExtractionPrompt("React and TypeScript", "en");
    expect(prompt).toContain("Extract");
    expect(prompt).toContain("JSON");
  });

  it("should include the content", () => {
    const content = "Building apps with Next.js";
    const prompt = buildTopicExtractionPrompt(content);
    expect(prompt).toContain(content);
  });
});

describe("buildTitlePrompt", () => {
  it("should generate Russian prompt by default", () => {
    const prompt = buildTitlePrompt("Саммари о React и Vue");
    expect(prompt).toContain("заголовок");
    expect(prompt).toContain("60 символов");
  });

  it("should generate English prompt when specified", () => {
    const prompt = buildTitlePrompt("Summary about React and Vue", "en");
    expect(prompt).toContain("title");
    expect(prompt).toContain("60 characters");
  });

  it("should include the content", () => {
    const content = "Today we learned about Docker";
    const prompt = buildTitlePrompt(content);
    expect(prompt).toContain(content);
  });
});

describe("buildPostSummaryPrompt", () => {
  it("should generate Russian prompt by default", () => {
    const prompt = buildPostSummaryPrompt("Длинный пост о программировании");
    expect(prompt).toContain("краткое описание");
  });

  it("should generate English prompt when specified", () => {
    const prompt = buildPostSummaryPrompt("Long post about programming", 200, "en");
    expect(prompt).toContain("brief description");
  });

  it("should respect custom max length", () => {
    const prompt = buildPostSummaryPrompt("Some content", 150);
    expect(prompt).toContain("150");
  });

  it("should include the content", () => {
    const content = "Important technical post";
    const prompt = buildPostSummaryPrompt(content);
    expect(prompt).toContain(content);
  });
});
