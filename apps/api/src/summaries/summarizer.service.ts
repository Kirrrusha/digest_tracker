import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";

import { PrismaService } from "../prisma/prisma.service";

// ---- Prompts ----

const SUMMARY_SYSTEM_PROMPT = `Ты — эксперт по программированию и техническим новостям.
Твоя задача — создавать краткие и информативные саммари из постов технических каналов.

Правила:
1. Группируй посты по темам (фреймворки, языки, инструменты, практики)
2. Выделяй ключевые новости и релизы
3. Сохраняй технические детали, которые важны для разработчиков
4. Используй markdown для форматирования
5. Будь лаконичен, но информативен
6. Если есть важные ссылки — сохраняй их

Формат ответа:
- Используй заголовки ## для основных разделов
- Используй ### для подразделов
- Используй списки для перечислений
- Выделяй важное **жирным**`;

const SUMMARY_SYSTEM_PROMPT_EN = `You are an expert in programming and tech news.
Your task is to create concise and informative summaries from technical channel posts.

Rules:
1. Group posts by topics (frameworks, languages, tools, practices)
2. Highlight key news and releases
3. Preserve technical details important for developers
4. Use markdown for formatting
5. Be concise but informative
6. Keep important links

Response format:
- Use ## for main sections
- Use ### for subsections
- Use lists for enumerations
- Highlight important things with **bold**`;

// ---- Topic extraction ----

const KNOWN_TOPICS: Record<string, string[]> = {
  React: ["react", "reactjs", "react.js", "реакт"],
  Vue: ["vue", "vuejs", "vue.js", "вью"],
  Angular: ["angular", "angularjs", "ангуляр"],
  Svelte: ["svelte", "sveltejs"],
  "Next.js": ["next", "nextjs", "next.js", "некст"],
  Nuxt: ["nuxt", "nuxtjs", "nuxt.js"],
  TypeScript: ["typescript", "ts", "тайпскрипт"],
  JavaScript: ["javascript", "js", "джаваскрипт", "жс"],
  Python: ["python", "py", "питон"],
  Go: ["golang", "go lang"],
  Rust: ["rust", "раст"],
  Java: ["java", "джава"],
  "C#": ["csharp", "c#", "шарп"],
  Kotlin: ["kotlin", "котлин"],
  Swift: ["swift", "свифт"],
  PHP: ["php", "пхп"],
  "Node.js": ["node", "nodejs", "node.js", "нода"],
  Deno: ["deno"],
  Bun: ["bun"],
  Express: ["express", "expressjs"],
  Fastify: ["fastify"],
  NestJS: ["nest", "nestjs"],
  Django: ["django", "джанго"],
  FastAPI: ["fastapi"],
  Spring: ["spring", "spring boot", "springboot"],
  PostgreSQL: ["postgres", "postgresql", "постгрес"],
  MySQL: ["mysql", "мускул"],
  MongoDB: ["mongodb", "mongo", "монго"],
  Redis: ["redis", "редис"],
  SQLite: ["sqlite"],
  Prisma: ["prisma", "призма"],
  Drizzle: ["drizzle"],
  Docker: ["docker", "докер"],
  Kubernetes: ["kubernetes", "k8s", "кубер"],
  AWS: ["aws", "amazon web services"],
  GCP: ["gcp", "google cloud"],
  Azure: ["azure", "азур"],
  Vercel: ["vercel"],
  "CI/CD": ["ci/cd", "cicd", "ci cd", "github actions", "gitlab ci"],
  Git: ["git", "гит"],
  GitHub: ["github", "гитхаб"],
  GitLab: ["gitlab", "гитлаб"],
  Webpack: ["webpack", "вебпак"],
  Vite: ["vite", "вайт"],
  Jest: ["jest", "джест"],
  Vitest: ["vitest"],
  Playwright: ["playwright"],
  Cypress: ["cypress"],
  "AI/ML": ["ai", "ml", "machine learning", "искусственный интеллект", "нейросет"],
  OpenAI: ["openai", "chatgpt", "gpt", "gpt-4", "gpt-3"],
  LLM: ["llm", "large language model"],
  "React Native": ["react native", "rn"],
  Flutter: ["flutter", "флаттер"],
  iOS: ["ios", "swiftui"],
  Android: ["android", "андроид"],
  API: ["api", "rest", "graphql", "grpc", "апи"],
  GraphQL: ["graphql", "граф"],
  WebSocket: ["websocket", "ws", "вебсокет"],
  SSR: ["ssr", "server side rendering"],
  Microservices: ["microservices", "микросервис"],
  Security: ["security", "безопасность", "auth", "аутентификация"],
  Performance: ["performance", "производительность", "оптимизация"],
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractTopicsFromContent(content: string): string[] {
  const lower = content.toLowerCase();
  const found = new Set<string>();

  for (const [topic, aliases] of Object.entries(KNOWN_TOPICS)) {
    for (const alias of aliases) {
      if (new RegExp(`\\b${escapeRegExp(alias)}\\b`, "i").test(lower)) {
        found.add(topic);
        break;
      }
    }
  }

  for (const topic of Object.keys(KNOWN_TOPICS)) {
    if (new RegExp(`\\b${escapeRegExp(topic)}\\b`, "i").test(content)) {
      found.add(topic);
    }
  }

  return Array.from(found)
    .sort((a, b) => {
      const ca = (lower.match(new RegExp(`\\b${escapeRegExp(a.toLowerCase())}\\b`, "gi")) || [])
        .length;
      const cb = (lower.match(new RegExp(`\\b${escapeRegExp(b.toLowerCase())}\\b`, "gi")) || [])
        .length;
      return cb - ca;
    })
    .slice(0, 7);
}

// ---- Prompt builder ----

function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  const truncated = content.slice(0, maxLength);
  const lastEnd = Math.max(
    truncated.lastIndexOf("."),
    truncated.lastIndexOf("!"),
    truncated.lastIndexOf("?")
  );
  if (lastEnd > maxLength * 0.7) return truncated.slice(0, lastEnd + 1);
  const lastSpace = truncated.lastIndexOf(" ");
  return truncated.slice(0, lastSpace) + "...";
}

interface PostForSummary {
  id: string;
  title: string | null;
  content: string;
  url: string | null;
  channelName: string;
  publishedAt: Date;
}

function buildSummaryPrompt(posts: PostForSummary[], language: string): string {
  const postsText = posts
    .map((post, i) => {
      const title = post.title ? `**${post.title}**` : "";
      const content = truncateContent(post.content, 500);
      const url = post.url ? `\nСсылка: ${post.url}` : "";
      return `### ${i + 1}. [${post.channelName}] ${title}\n${content}${url}`;
    })
    .join("\n\n---\n\n");

  if (language === "ru") {
    return `Проанализируй следующие ${posts.length} постов из технических каналов и создай структурированное саммари.

## Посты для анализа:

${postsText}

## Задание:

Создай саммари, которое включает:

1. **Основные темы дня** — перечисли 3-5 ключевых тем с кратким описанием
2. **Важные релизы и новости** — если есть анонсы версий, новых инструментов
3. **Полезные практики** — советы и best practices из постов
4. **Интересные ресурсы** — ссылки на статьи, репозитории, туториалы

Формат: используй Markdown с заголовками, списками и выделением важного.`;
  }

  return `Analyze the following ${posts.length} posts from technical channels and create a structured summary.

## Posts to analyze:

${postsText}

## Task:

Create a summary that includes:

1. **Main topics of the day** — list 3-5 key topics with brief descriptions
2. **Important releases and news** — version announcements, new tools
3. **Useful practices** — tips and best practices from posts
4. **Interesting resources** — links to articles, repositories, tutorials

Format: use Markdown with headers, lists, and highlight important things.`;
}

// ---- Sources section ----

function buildSourcesSection(posts: PostForSummary[], language: string): string {
  const postsWithUrls = posts.filter((p) => p.url);
  if (postsWithUrls.length === 0) return "";

  const header = language === "ru" ? "\n\n---\n\n## Источники\n\n" : "\n\n---\n\n## Sources\n\n";
  const links = postsWithUrls
    .map((p) => {
      const label = p.title ? `${p.channelName} — ${p.title}` : p.channelName;
      return `- [${label}](${p.url})`;
    })
    .join("\n");

  return header + links;
}

// ---- Service ----

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

@Injectable()
export class SummarizerService {
  private openai: OpenAI | null = null;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService
  ) {}

  private getOpenAI(): OpenAI {
    if (!this.openai) {
      const baseURL = this.config.get<string>("OPENAI_BASE_URL");
      this.openai = new OpenAI({
        apiKey: this.config.get<string>("OPENAI_API_KEY"),
        ...(baseURL ? { baseURL } : {}),
      });
    }
    return this.openai;
  }

  async generateDaily(userId: string) {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    const period = `daily-${today.toISOString().split("T")[0]}`;

    const existing = await this.prisma.summary.findFirst({ where: { userId, period } });
    if (existing) return existing;

    const posts = await this.prisma.post.findMany({
      where: {
        channel: { userId },
        publishedAt: { gte: startOfDay, lte: endOfDay },
      },
      include: { channel: { select: { name: true } } },
      orderBy: { publishedAt: "desc" },
      take: 50,
    });

    if (posts.length === 0) throw new Error("Нет постов за сегодня");

    const preferences = await this.prisma.userPreferences.findUnique({ where: { userId } });
    const language = preferences?.language || "ru";

    const postsForSummary: PostForSummary[] = posts.map((p) => ({
      id: p.id,
      title: p.title,
      content: p.contentPreview || "",
      url: p.url,
      channelName: p.channel.name,
      publishedAt: p.publishedAt,
    }));

    const result = await this.callOpenAI(postsForSummary, language);
    const todayFormatted = today.toLocaleDateString(language === "ru" ? "ru-RU" : "en-US", {
      day: "numeric",
      month: "long",
    });
    const title =
      language === "ru" ? `Саммари за ${todayFormatted}` : `Summary for ${todayFormatted}`;
    const content = result.content + buildSourcesSection(postsForSummary, language);

    return this.prisma.summary.create({
      data: {
        userId,
        title,
        content,
        topics: result.topics,
        period,
        posts: { connect: posts.map((p) => ({ id: p.id })) },
      },
    });
  }

  async generateWeekly(userId: string) {
    const today = new Date();
    const weekNumber = getWeekNumber(today);
    const period = `weekly-${today.getFullYear()}-${weekNumber}`;

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const existing = await this.prisma.summary.findFirst({ where: { userId, period } });
    if (existing) return existing;

    const posts = await this.prisma.post.findMany({
      where: {
        channel: { userId },
        publishedAt: { gte: startOfWeek, lte: endOfWeek },
      },
      include: { channel: { select: { name: true } } },
      orderBy: { publishedAt: "desc" },
      take: 100,
    });

    if (posts.length === 0) throw new Error("Нет постов за эту неделю");

    const preferences = await this.prisma.userPreferences.findUnique({ where: { userId } });
    const language = preferences?.language || "ru";

    const postsForSummary: PostForSummary[] = posts.map((p) => ({
      id: p.id,
      title: p.title,
      content: p.contentPreview || "",
      url: p.url,
      channelName: p.channel.name,
      publishedAt: p.publishedAt,
    }));

    const result = await this.callOpenAI(postsForSummary, language);
    const title =
      language === "en" ? `Weekly Summary #${weekNumber}` : `Недельное саммари #${weekNumber}`;
    const content = result.content + buildSourcesSection(postsForSummary, language);

    return this.prisma.summary.create({
      data: {
        userId,
        title,
        content,
        topics: result.topics,
        period,
        posts: { connect: posts.map((p) => ({ id: p.id })) },
      },
    });
  }

  private async callOpenAI(posts: PostForSummary[], language: string) {
    const model = this.config.get<string>("OPENAI_MODEL") || "gpt-4-turbo-preview";
    const systemPrompt = language === "ru" ? SUMMARY_SYSTEM_PROMPT : SUMMARY_SYSTEM_PROMPT_EN;

    const response = await this.getOpenAI().chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: buildSummaryPrompt(posts, language) },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Пустой ответ от OpenAI");

    return {
      content,
      topics: extractTopicsFromContent(content),
    };
  }

  async regenerate(userId: string, summaryId: string) {
    const existing = await this.prisma.summary.findFirst({
      where: { id: summaryId, userId },
      include: {
        posts: {
          select: {
            id: true,
            title: true,
            contentPreview: true,
            url: true,
            publishedAt: true,
            channel: { select: { name: true } },
          },
        },
      },
    });
    if (!existing) throw new Error("Саммари не найдено");
    if (existing.posts.length === 0) throw new Error("Нет постов для регенерации");

    const preferences = await this.prisma.userPreferences.findUnique({ where: { userId } });
    const language = preferences?.language || "ru";

    const postsForSummary: PostForSummary[] = existing.posts.map((p) => ({
      id: p.id,
      title: p.title,
      content: p.contentPreview || "",
      url: p.url,
      channelName: p.channel.name,
      publishedAt: p.publishedAt,
    }));

    const result = await this.callOpenAI(postsForSummary, language);
    const content = result.content + buildSourcesSection(postsForSummary, language);

    return this.prisma.summary.update({
      where: { id: summaryId },
      data: { content, topics: result.topics },
    });
  }
}
