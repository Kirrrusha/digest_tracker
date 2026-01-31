import OpenAI from "openai";

import { db } from "@/lib/db";

import { buildSummaryPrompt, SUMMARY_SYSTEM_PROMPT } from "./prompts";
import { extractTopicsFromContent } from "./topic-extractor";

/**
 * Конфигурация OpenAI клиента
 */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Модель по умолчанию
 */
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4-turbo-preview";

/**
 * Интерфейс поста для суммаризации
 */
export interface PostForSummary {
  id: string;
  title: string | null;
  content: string;
  url: string | null;
  channelName: string;
  publishedAt: Date;
}

/**
 * Результат генерации саммари
 */
export interface SummaryResult {
  title: string;
  content: string;
  topics: string[];
  highlights: string[];
}

/**
 * Опции генерации
 */
export interface GenerateOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  language?: string;
}

/**
 * Генерация саммари из постов с помощью OpenAI
 */
export async function generateSummaryFromPosts(
  posts: PostForSummary[],
  options: GenerateOptions = {}
): Promise<SummaryResult> {
  const { model = DEFAULT_MODEL, temperature = 0.3, maxTokens = 4000, language = "ru" } = options;

  if (posts.length === 0) {
    throw new Error("No posts provided for summary generation");
  }

  const prompt = buildSummaryPrompt(posts, language);

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SUMMARY_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature,
    max_tokens: maxTokens,
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  // Парсим ответ и извлекаем структурированные данные
  const parsedResult = parseSummaryResponse(content, posts, language);

  return parsedResult;
}

/**
 * Парсинг ответа от AI в структурированный формат
 */
function parseSummaryResponse(
  content: string,
  posts: PostForSummary[],
  language: string
): SummaryResult {
  // Извлекаем темы из контента
  const topics = extractTopicsFromContent(content);

  // Извлекаем highlights (ключевые моменты)
  const highlights = extractHighlights(content);

  // Генерируем заголовок
  const today = new Date().toLocaleDateString(language === "ru" ? "ru-RU" : "en-US", {
    day: "numeric",
    month: "long",
  });

  const title = language === "ru" ? `Саммари за ${today}` : `Summary for ${today}`;

  return {
    title,
    content,
    topics,
    highlights,
  };
}

/**
 * Извлечение ключевых моментов из текста
 */
function extractHighlights(content: string): string[] {
  const highlights: string[] = [];

  // Ищем маркеры ключевых моментов
  const patterns = [
    /(?:ключев(?:ой|ые|ых)|важн(?:ый|ые|ых)|главн(?:ый|ые|ых))[\s:]+([^\n]+)/gi,
    /(?:key|important|main)[\s:]+([^\n]+)/gi,
    /^[\-\*]\s+(.{20,100})$/gm,
  ];

  for (const pattern of patterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && highlights.length < 5) {
        highlights.push(match[1].trim());
      }
    }
  }

  return highlights;
}

/**
 * Генерация дневного саммари для пользователя
 */
export async function generateDailySummary(
  userId: string,
  options: GenerateOptions = {}
): Promise<{
  id: string;
  title: string;
  content: string;
  topics: string[];
  period: string;
  createdAt: Date;
}> {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));
  const period = `daily-${today.toISOString().split("T")[0]}`;

  // Проверяем, есть ли уже саммари за сегодня
  const existingSummary = await db.summary.findFirst({
    where: { userId, period },
  });

  if (existingSummary) {
    return existingSummary;
  }

  // Получаем посты за сегодня из каналов пользователя
  const posts = await db.post.findMany({
    where: {
      channel: { userId },
      publishedAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      channel: {
        select: { name: true },
      },
    },
    orderBy: { publishedAt: "desc" },
    take: 50, // Ограничиваем количество постов
  });

  if (posts.length === 0) {
    throw new Error("No posts found for today");
  }

  // Преобразуем в формат для суммаризации
  const postsForSummary: PostForSummary[] = posts.map((post) => ({
    id: post.id,
    title: post.title,
    content: post.content,
    url: post.url,
    channelName: post.channel.name,
    publishedAt: post.publishedAt,
  }));

  // Получаем настройки пользователя для языка
  const preferences = await db.userPreferences.findUnique({
    where: { userId },
  });

  // Генерируем саммари
  const summaryResult = await generateSummaryFromPosts(postsForSummary, {
    ...options,
    language: preferences?.language || "ru",
  });

  // Сохраняем в БД
  const summary = await db.summary.create({
    data: {
      userId,
      title: summaryResult.title,
      content: summaryResult.content,
      topics: summaryResult.topics,
      period,
      posts: {
        connect: posts.map((p) => ({ id: p.id })),
      },
    },
  });

  return summary;
}

/**
 * Генерация недельного саммари
 */
export async function generateWeeklySummary(
  userId: string,
  options: GenerateOptions = {}
): Promise<{
  id: string;
  title: string;
  content: string;
  topics: string[];
  period: string;
  createdAt: Date;
}> {
  const today = new Date();
  const weekNumber = getWeekNumber(today);
  const period = `weekly-${today.getFullYear()}-${weekNumber}`;

  // Начало и конец недели
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Понедельник
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  // Проверяем существующее саммари
  const existingSummary = await db.summary.findFirst({
    where: { userId, period },
  });

  if (existingSummary) {
    return existingSummary;
  }

  // Получаем посты за неделю
  const posts = await db.post.findMany({
    where: {
      channel: { userId },
      publishedAt: {
        gte: startOfWeek,
        lte: endOfWeek,
      },
    },
    include: {
      channel: {
        select: { name: true },
      },
    },
    orderBy: { publishedAt: "desc" },
    take: 100,
  });

  if (posts.length === 0) {
    throw new Error("No posts found for this week");
  }

  const postsForSummary: PostForSummary[] = posts.map((post) => ({
    id: post.id,
    title: post.title,
    content: post.content,
    url: post.url,
    channelName: post.channel.name,
    publishedAt: post.publishedAt,
  }));

  const preferences = await db.userPreferences.findUnique({
    where: { userId },
  });

  const summaryResult = await generateSummaryFromPosts(postsForSummary, {
    ...options,
    language: preferences?.language || "ru",
  });

  const summary = await db.summary.create({
    data: {
      userId,
      title:
        preferences?.language === "en"
          ? `Weekly Summary #${weekNumber}`
          : `Недельное саммари #${weekNumber}`,
      content: summaryResult.content,
      topics: summaryResult.topics,
      period,
      posts: {
        connect: posts.map((p) => ({ id: p.id })),
      },
    },
  });

  return summary;
}

/**
 * Получение номера недели в году
 */
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}
