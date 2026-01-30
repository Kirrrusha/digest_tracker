// Summarizer
export {
  generateDailySummary,
  generateSummaryFromPosts,
  generateWeeklySummary,
} from "./summarizer";
export type { GenerateOptions, PostForSummary, SummaryResult } from "./summarizer";

// Prompts
export {
  buildPostSummaryPrompt,
  buildSummaryPrompt,
  buildTitlePrompt,
  buildTopicExtractionPrompt,
  SUMMARY_SYSTEM_PROMPT,
  SUMMARY_SYSTEM_PROMPT_EN,
} from "./prompts";

// Topic Extractor
export {
  extractTopicsFromContent,
  extractTopicsFromPosts,
  getRelatedTopics,
  isKnownTopic,
  normalizeTopic,
} from "./topic-extractor";
