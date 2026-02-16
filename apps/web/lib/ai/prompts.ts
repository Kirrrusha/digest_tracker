import type { PostForSummary } from "./summarizer";

/**
 * Системный промпт для генерации саммари
 */
export const SUMMARY_SYSTEM_PROMPT = `Ты — эксперт по программированию и техническим новостям.
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

/**
 * Системный промпт на английском
 */
export const SUMMARY_SYSTEM_PROMPT_EN = `You are an expert in programming and tech news.
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

/**
 * Построение промпта для генерации саммари
 */
export function buildSummaryPrompt(posts: PostForSummary[], language: string = "ru"): string {
  const isRussian = language === "ru";

  const postsText = posts
    .map((post, index) => {
      const title = post.title ? `**${post.title}**` : "";
      const channel = `[${post.channelName}]`;
      const content = truncateContent(post.content, 500);
      const url = post.url ? `\nСсылка: ${post.url}` : "";

      return `### ${index + 1}. ${channel} ${title}\n${content}${url}`;
    })
    .join("\n\n---\n\n");

  if (isRussian) {
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

/**
 * Промпт для извлечения тем из текста
 */
export function buildTopicExtractionPrompt(content: string, language: string = "ru"): string {
  if (language === "ru") {
    return `Извлеки основные технические темы из следующего текста.
Верни список из 3-7 тем в формате JSON массива.
Используй общепринятые названия технологий (React, TypeScript, Docker и т.д.).

Текст:
${content}

Ответ (только JSON массив):`;
  }

  return `Extract main technical topics from the following text.
Return a list of 3-7 topics as a JSON array.
Use common technology names (React, TypeScript, Docker, etc.).

Text:
${content}

Response (JSON array only):`;
}

/**
 * Промпт для генерации заголовка саммари
 */
export function buildTitlePrompt(content: string, language: string = "ru"): string {
  if (language === "ru") {
    return `Придумай краткий заголовок (до 60 символов) для следующего саммари.
Заголовок должен отражать основные темы дня.

Саммари:
${truncateContent(content, 1000)}

Ответ (только заголовок):`;
  }

  return `Create a short title (up to 60 characters) for the following summary.
The title should reflect the main topics of the day.

Summary:
${truncateContent(content, 1000)}

Response (title only):`;
}

/**
 * Промпт для краткого описания поста
 */
export function buildPostSummaryPrompt(
  content: string,
  maxLength: number = 200,
  language: string = "ru"
): string {
  if (language === "ru") {
    return `Создай краткое описание (до ${maxLength} символов) для следующего поста.
Сохрани ключевую информацию и технические детали.

Пост:
${content}

Краткое описание:`;
  }

  return `Create a brief description (up to ${maxLength} characters) for the following post.
Preserve key information and technical details.

Post:
${content}

Brief description:`;
}

/**
 * Обрезка контента до указанной длины
 */
function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }

  // Ищем последнее предложение в пределах лимита
  const truncated = content.slice(0, maxLength);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf("."),
    truncated.lastIndexOf("!"),
    truncated.lastIndexOf("?")
  );

  if (lastSentenceEnd > maxLength * 0.7) {
    return truncated.slice(0, lastSentenceEnd + 1);
  }

  // Если не нашли конец предложения, обрезаем по последнему пробелу
  const lastSpace = truncated.lastIndexOf(" ");
  return truncated.slice(0, lastSpace) + "...";
}
