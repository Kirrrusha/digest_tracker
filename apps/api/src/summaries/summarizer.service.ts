import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";

import { MtprotoService } from "../mtproto/mtproto.service";
import { PrismaService } from "../prisma/prisma.service";

// ---- Prompts ----

function buildSystemPrompt(language: string, sourceContext?: string): string {
  const outputLang = language === "ru" ? "Russian" : "English";
  const contextNote = sourceContext
    ? `\nThis digest is specifically for ${sourceContext}. Focus on content from this source.`
    : "";

  return `You are an expert news analyst and editor creating structured daily digests from Telegram channels.

Your goal is to give the reader a clear, comprehensive overview of everything significant — across ALL topics present in the posts: technology, science, politics, economics, business, culture, sports, and more. Do not skip non-technical content.

Rules:
1. Cover ALL significant news from ALL posts regardless of topic
2. Identify the natural themes from the actual content — do not force a technical framing
3. Group related posts under shared topic headings
4. Highlight key events, announcements, releases, and developments
5. Preserve important details specific to each topic (e.g. version numbers for software, names for political news, prices for business)
6. When referencing a specific post, insert an inline citation [N] directly in the text, where N is the post's order number in the list (e.g. "Xbox Project Helix announced [3][9]" or "ФАС признала рекламу в Telegram незаконной [14][26]")
7. Do NOT add a sources section — it will be appended automatically
8. Write the entire summary in ${outputLang}${contextNote}

Formatting:
- Use ## for main topic sections — heading text must NOT be wrapped in **bold** (e.g. "## Технологии", not "## **Технологии**" and not "### **## Технологии**")
- Use ### for subsections if needed — same rule, no bold wrapper
- Use bullet lists for enumerations
- Bold **important facts, names, and figures** inside body text only`;
}

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

export interface PostForSummary {
  title: string | null;
  content: string;
  url: string | null;
  channelName: string;
  publishedAt: Date;
}

function buildSummaryPrompt(posts: PostForSummary[]): string {
  const postsText = posts
    .map((post, i) => {
      const title = post.title ? `**${post.title}**` : "";
      const content = truncateContent(post.content, 500);
      const url = post.url ? `\nLink: ${post.url}` : "";
      return `### ${i + 1}. [${post.channelName}] ${title}\n${content}${url}`;
    })
    .join("\n\n---\n\n");

  return `Analyze the following ${posts.length} posts from Telegram channels and write a structured digest.

## Posts:

${postsText}

## Task:

Write a digest covering all significant content. Group posts by topic naturally. For each topic include key facts, names, and figures. Cite posts inline as [N] (e.g. "React 19 released [3]" or "Xbox Project Helix announced [3][9]").
Format: Markdown with ## topic headers, bullet lists, and **bold** for key facts.`;
}

// ---- Sources section ----

function buildSourcesSection(posts: PostForSummary[], language: string): string {
  if (posts.length === 0) return "";

  const header = language === "ru" ? "\n\n---\n\n## Источники\n\n" : "\n\n---\n\n## Sources\n\n";
  const items = posts
    .map((p, i) => {
      const label = p.title ? `${p.channelName} — ${p.title}` : p.channelName;
      return p.url ? `${i + 1}. [${label}](${p.url})` : `${i + 1}. ${label}`;
    })
    .join("\n");

  return header + items;
}

// ---- Citation injection ----

function injectCitationLinks(content: string, posts: PostForSummary[]): string {
  return content.replace(/\[(\d+)\](?!\()/g, (match, n) => {
    const index = parseInt(n, 10) - 1;
    const post = posts[index];
    if (post?.url) {
      return `[[${n}]](${post.url})`;
    }
    return match;
  });
}

// ---- Service ----

@Injectable()
export class SummarizerService {
  private openai: OpenAI | null = null;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private mtproto: MtprotoService
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

  private async fetchAllUserMessages(userId: string, limit: number): Promise<PostForSummary[]> {
    const channels = await this.prisma.channel.findMany({
      where: { userId, sourceType: "telegram_mtproto", isActive: true },
      select: { id: true, isGroup: true },
    });

    const all: PostForSummary[] = [];
    for (const ch of channels) {
      try {
        const msgs = ch.isGroup
          ? await this.mtproto.fetchGroupMessages(userId, ch.id, limit)
          : await this.mtproto.fetchChannelMessages(userId, ch.id, limit);
        all.push(...msgs);
      } catch {
        // skip channels that fail (e.g. no session)
      }
    }
    return all;
  }

  async generateUnread(userId: string) {
    const posts = await this.mtproto.fetchAllUnreadMessages(userId);

    if (posts.length === 0) throw new Error("Нет непрочитанных сообщений");

    const sorted = posts
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
      .slice(0, 150);

    const period = `unread-${new Date().toISOString()}`;
    const preferences = await this.prisma.userPreferences.findUnique({ where: { userId } });
    const language = preferences?.language || "ru";

    const result = await this.callOpenAI(sorted, language);
    const todayFormatted = new Date().toLocaleDateString(language === "ru" ? "ru-RU" : "en-US", {
      day: "numeric",
      month: "long",
    });
    const title =
      language === "ru" ? `Саммари за ${todayFormatted}` : `Summary for ${todayFormatted}`;
    const citedContent = injectCitationLinks(result.content, sorted);
    const content = citedContent + buildSourcesSection(sorted, language);

    return this.prisma.summary.create({
      data: {
        userId,
        title,
        content,
        topics: {
          connectOrCreate: result.topics.map((name: string) => ({
            where: { name },
            create: { name },
          })),
        },
        period,
      },
    });
  }

  private async callOpenAI(posts: PostForSummary[], language: string, sourceContext?: string) {
    const model = this.config.get<string>("OPENAI_MODEL") || "gpt-4-turbo-preview";
    const systemPrompt = buildSystemPrompt(language, sourceContext);

    const response = await this.getOpenAI().chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: buildSummaryPrompt(posts) },
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

  async generateForChannel(userId: string, channelId: string) {
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, userId },
    });
    if (!channel) throw new Error("Канал не найден");

    const posts = await this.mtproto.fetchAllUnreadMessages(userId, [channelId]);

    if (posts.length === 0) throw new Error("Нет непрочитанных сообщений в этом канале");

    const sorted = posts
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
      .slice(0, 100);

    const period = `channel-${channelId}-unread-${Date.now()}`;
    const preferences = await this.prisma.userPreferences.findUnique({ where: { userId } });
    const language = preferences?.language || "ru";
    const sourceTypeName = channel.isGroup
      ? language === "ru"
        ? "группы"
        : "group"
      : language === "ru"
        ? "канала"
        : "channel";

    const result = await this.callOpenAI(sorted, language, `${sourceTypeName} «${channel.name}»`);

    const dateFormatted = new Date().toLocaleDateString(language === "ru" ? "ru-RU" : "en-US", {
      day: "numeric",
      month: "long",
    });
    const title =
      language === "ru"
        ? `${channel.name} — саммари за ${dateFormatted}`
        : `${channel.name} — summary for ${dateFormatted}`;

    const citedContent = injectCitationLinks(result.content, sorted);
    const content = citedContent + buildSourcesSection(sorted, language);

    return this.prisma.summary.create({
      data: {
        userId,
        title,
        content,
        period,
        channelId,
        topics: {
          connectOrCreate: result.topics.map((name: string) => ({
            where: { name },
            create: { name },
          })),
        },
      },
    });
  }

  async generateForFolder(
    userId: string,
    telegramIds: string[],
    folderId: number,
    folderTitle: string
  ) {
    const validChannels = await this.prisma.channel.findMany({
      where: { telegramId: { in: telegramIds }, userId },
      select: { id: true },
    });
    if (validChannels.length === 0) throw new Error("Нет доступных каналов в папке");

    const channelIds = validChannels.map((c) => c.id);
    const posts = await this.mtproto.fetchAllUnreadMessages(userId, channelIds);

    if (posts.length === 0) throw new Error("Нет непрочитанных сообщений в папке");

    const sorted = posts
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
      .slice(0, 100);

    const period = `folder-${folderId}-unread-${Date.now()}`;
    const preferences = await this.prisma.userPreferences.findUnique({ where: { userId } });
    const language = preferences?.language || "ru";

    const sourceContext = language === "ru" ? `папки «${folderTitle}»` : `folder "${folderTitle}"`;
    const result = await this.callOpenAI(sorted, language, sourceContext);

    const dateFormatted = new Date().toLocaleDateString(language === "ru" ? "ru-RU" : "en-US", {
      day: "numeric",
      month: "long",
    });
    const title =
      language === "ru"
        ? `${folderTitle} — саммари за ${dateFormatted}`
        : `${folderTitle} — summary for ${dateFormatted}`;

    const citedContent = injectCitationLinks(result.content, sorted);
    const content = citedContent + buildSourcesSection(sorted, language);

    return this.prisma.summary.create({
      data: {
        userId,
        title,
        content,
        period,
        topics: {
          connectOrCreate: result.topics.map((name: string) => ({
            where: { name },
            create: { name },
          })),
        },
      },
    });
  }

  async regenerate(userId: string, summaryId: string) {
    const existing = await this.prisma.summary.findFirst({
      where: { id: summaryId, userId },
    });
    if (!existing) throw new Error("Саммари не найдено");

    // Re-fetch from source and re-generate based on summary type
    const period = existing.period;
    let posts: PostForSummary[] = [];

    if (period.startsWith("channel-") && existing.channelId) {
      const channel = await this.prisma.channel.findFirst({
        where: { id: existing.channelId, userId },
      });
      if (!channel) throw new Error("Канал не найден");
      posts = channel.isGroup
        ? await this.mtproto.fetchGroupMessages(userId, existing.channelId, 50)
        : await this.mtproto.fetchChannelMessages(userId, existing.channelId, 50);
    } else {
      posts = await this.fetchAllUserMessages(userId, 50);
    }

    if (posts.length === 0) throw new Error("Нет постов для регенерации");

    posts = posts.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()).slice(0, 50);

    const preferences = await this.prisma.userPreferences.findUnique({ where: { userId } });
    const language = preferences?.language || "ru";

    const result = await this.callOpenAI(posts, language);
    const citedContent = injectCitationLinks(result.content, posts);
    const content = citedContent + buildSourcesSection(posts, language);

    return this.prisma.summary.update({
      where: { id: summaryId },
      data: {
        content,
        topics: {
          set: [],
          connectOrCreate: result.topics.map((name: string) => ({
            where: { name },
            create: { name },
          })),
        },
      },
    });
  }
}
