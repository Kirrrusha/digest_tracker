# План разработки DevDigest Tracker

## Обзор проекта

**DevDigest Tracker** — веб-приложение для агрегации и суммаризации постов из Telegram-каналов по программированию с использованием Next.js 16.

### Цели проекта

- Агрегация контента из Telegram-каналов и RSS-фидов
- Автоматическая генерация саммари с помощью LLM
- Персонализированный дашборд с фильтрацией по темам
- Максимальное использование возможностей Next.js 16

---

## Технологический стек

### Frontend

- **Next.js 16** (App Router, PPR, Server Actions)
- **TypeScript** — типобезопасность
- **Tailwind CSS** — стилизация
- **shadcn/ui** — готовые компоненты (опционально)

### Backend

- **Next.js Server Actions** — серверная логика
- **PostgreSQL** (Docker) — основная БД
- **Prisma** — ORM для работы с БД
- **Redis** (Docker, опционально) — кэширование

### Интеграции

- **Telegram Bot API** — парсинг каналов
- **OpenAI API** (GPT-4) — генерация саммари
- **Ollama** (опционально) — локальная LLM для разработки
- **RSS Parser** — парсинг RSS-фидов

### Инфраструктура

- **Docker** — PostgreSQL + Redis в контейнерах
- **Vercel** (опционально) — хостинг и деплой
- **GitHub Actions** — CI/CD
- **Cron Jobs** — автоматический парсинг (node-cron или системный cron)

---

## Docker Setup

### docker-compose.yml

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    container_name: devdigest_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: devdigest
      POSTGRES_PASSWORD: devdigest_password
      POSTGRES_DB: devdigest_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U devdigest"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: devdigest_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # Опционально: pgAdmin для управления БД
  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: devdigest_pgadmin
    restart: unless-stopped
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@devdigest.local
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"
    depends_on:
      - postgres

volumes:
  postgres_data:
  redis_data:
```

### Команды для работы с Docker

```bash
# Запустить все сервисы
docker-compose up -d

# Посмотреть логи
docker-compose logs -f

# Остановить сервисы
docker-compose down

# Остановить и удалить данные
docker-compose down -v

# Перезапустить конкретный сервис
docker-compose restart postgres

# Подключиться к PostgreSQL
docker exec -it devdigest_postgres psql -U devdigest -d devdigest_db
```

### .env.local для разработки

```bash
# Database
DATABASE_URL="postgresql://devdigest:devdigest_password@localhost:5432/devdigest_db"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# Telegram
TELEGRAM_BOT_TOKEN="your-telegram-bot-token"

# OpenAI
OPENAI_API_KEY="sk-your-openai-api-key"

# Redis (опционально)
REDIS_URL="redis://localhost:6379"
```

---

## Архитектура приложения

### Структура проекта

```
devdigest/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Главный дашборд
│   │   ├── channels/             # Управление каналами
│   │   ├── summaries/            # Просмотр саммари
│   │   └── settings/             # Настройки пользователя
│   ├── api/
│   │   ├── telegram/             # Webhook для Telegram
│   │   ├── cron/                 # Задачи по расписанию
│   │   └── webhooks/
│   └── actions/                  # Server Actions
├── lib/
│   ├── db/                       # Prisma клиент и схемы
│   ├── telegram/                 # Telegram API клиент
│   ├── ai/                       # OpenAI/Ollama клиент
│   ├── parsers/                  # RSS и контент парсеры
│   └── utils/
├── components/
│   ├── ui/                       # Базовые UI компоненты
│   ├── dashboard/                # Компоненты дашборда
│   └── channels/                 # Компоненты каналов
└── prisma/
    └── schema.prisma
```

### Схема базы данных

```prisma
// Пользователи
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  passwordHash  String
  createdAt     DateTime  @default(now())
  channels      Channel[]
  preferences   UserPreferences?
}

// Настройки пользователя
model UserPreferences {
  id              String   @id @default(cuid())
  userId          String   @unique
  topics          String[] // Избранные темы (React, TS, etc)
  summaryInterval String   @default("daily") // daily, weekly
  language        String   @default("ru")
  user            User     @relation(fields: [userId], references: [id])
}

// Каналы/источники
model Channel {
  id          String    @id @default(cuid())
  userId      String
  name        String
  type        String    // telegram, rss
  sourceUrl   String    // URL канала или RSS
  telegramId  String?   // ID Telegram канала
  isActive    Boolean   @default(true)
  tags        String[]  // Категории (frontend, backend, etc)
  createdAt   DateTime  @default(now())
  user        User      @relation(fields: [userId], references: [id])
  posts       Post[]
}

// Посты из каналов
model Post {
  id          String    @id @default(cuid())
  channelId   String
  externalId  String    // ID поста в источнике
  title       String?
  content     String    @db.Text
  url         String?
  author      String?
  publishedAt DateTime
  createdAt   DateTime  @default(now())
  channel     Channel   @relation(fields: [channelId], references: [id])
  summaries   Summary[]

  @@unique([channelId, externalId])
}

// Саммари
model Summary {
  id          String    @id @default(cuid())
  userId      String
  title       String
  content     String    @db.Text
  topics      String[]  // Выделенные темы
  period      String    // daily-2024-01-25
  postIds     String[]  // Ссылки на посты
  posts       Post[]
  createdAt   DateTime  @default(now())

  @@index([userId, period])
}
```

---

## Этапы разработки

## Этап 1: Инициализация проекта и базовая настройка (День 1-2)

### 1.1 Создание проекта

```bash
npx create-next-app@16 devdigest --ts --tailwind --app
cd devdigest
```

### 1.2 Установка зависимостей

```bash
# База данных
pnpm install prisma @prisma/client
pnpm install -D prisma

# Аутентификация (NextAuth.js v5)
pnpm install next-auth@beta bcryptjs
pnpm install -D @types/bcryptjs

# Telegram & RSS
pnpm install grammy rss-parser

# AI
pnpm install openai

# UI
pnpm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
pnpm install lucide-react date-fns zod

# Redis для кэширования (опционально)
pnpm install ioredis
pnpm install -D @types/ioredis

# Cron для фоновых задач
pnpm install node-cron
pnpm install -D @types/node-cron
```

### 1.3 Настройка окружения

Скопируйте `.env.example` в `.env.local` и заполните значения:

```bash
cp .env.example .env.local
```

Сгенерируйте секретный ключ для NextAuth:

```bash
openssl rand -base64 32
```

### 1.4 Инициализация Prisma

```bash
npx prisma init
# Настроить schema.prisma (см. выше)
npx prisma migrate dev --name init
npx prisma generate
```

---

## Этап 2: Аутентификация (День 2-3)

### 2.1 Настройка NextAuth.js

- Создать `/app/api/auth/[...nextauth]/route.ts`
- Настроить Credentials Provider
- Создать middleware для защиты роутов

### 2.2 Страницы аутентификации

- `/app/(auth)/login/page.tsx`
- `/app/(auth)/register/page.tsx`
- Формы с валидацией (Zod)
- Server Actions для регистрации/логина

### 2.3 Компоненты

- `components/auth/LoginForm.tsx`
- `components/auth/RegisterForm.tsx`
- Обработка ошибок

---

## Этап 3: Telegram интеграция (День 3-5)

### 3.1 Telegram Bot клиент

```typescript
// lib/telegram/client.ts
import { Bot } from "grammy";

export class TelegramService {
  private bot: Bot;

  async getChannelPosts(channelId: string, limit: number = 100) {
    // Получение постов из канала
  }

  async parsePost(message: any) {
    // Парсинг поста в структурированный формат
  }
}
```

### 3.2 API роуты

- `/app/api/telegram/webhook/route.ts` — обработка обновлений
- `/app/api/telegram/fetch/route.ts` — ручной фетч постов

### 3.3 Парсер контента

```typescript
// lib/parsers/telegram-parser.ts
export async function parseTelegramPost(message: TelegramMessage) {
  return {
    externalId: message.message_id.toString(),
    title: extractTitle(message.text),
    content: message.text || message.caption,
    url: extractUrls(message),
    publishedAt: new Date(message.date * 1000),
  };
}
```

### 3.4 Server Actions

```typescript
// app/actions/channels.ts
"use server";

export async function addTelegramChannel(formData: FormData) {
  // Валидация
  // Проверка доступности канала
  // Сохранение в БД
  // Первичный фетч постов
}
```

---

## Этап 4: RSS интеграция (День 5-6)

### 4.1 RSS Parser

```typescript
// lib/parsers/rss-parser.ts
import Parser from "rss-parser";

export async function parseRSSFeed(url: string) {
  const parser = new Parser();
  const feed = await parser.parseURL(url);
  return feed.items.map((item) => ({
    externalId: item.guid || item.link,
    title: item.title,
    content: item.content || item.summary,
    url: item.link,
    publishedAt: new Date(item.pubDate),
  }));
}
```

### 4.2 Унификация парсеров

- Общий интерфейс для Telegram и RSS
- Фабрика парсеров

---

## Этап 5: AI Суммаризация (День 6-8)

### 5.1 OpenAI интеграция

```typescript
// lib/ai/summarizer.ts
import OpenAI from "openai";

export async function generateSummary(posts: Post[]) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `
    Проанализируй следующие посты из каналов по программированию за сегодня.
    Создай структурированное саммари с выделением основных тем и ключевых моментов.

    Посты:
    ${posts.map((p) => `- ${p.title}: ${p.content.slice(0, 500)}`).join("\n")}

    Формат ответа:
    1. Основные темы (теги)
    2. Краткое саммари по каждой теме
    3. Важные ссылки и ресурсы
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  return response.choices[0].message.content;
}
```

### 5.2 Кэширование саммари

```typescript
// lib/cache/summary-cache.ts
import { unstable_cache } from "next/cache";

export const getCachedSummary = unstable_cache(
  async (userId: string, period: string) => {
    return await db.summary.findFirst({
      where: { userId, period },
    });
  },
  ["summary"],
  { revalidate: 3600, tags: ["summary"] }
);
```

### 5.3 Server Action для генерации

```typescript
// app/actions/summaries.ts
"use server";

export async function generateDailySummary(userId: string) {
  const today = format(new Date(), "yyyy-MM-dd");
  const period = `daily-${today}`;

  // Получить все посты за сегодня
  const posts = await getTodaysPosts(userId);

  // Генерировать саммари
  const content = await generateSummary(posts);

  // Сохранить в БД
  const summary = await db.summary.create({
    data: {
      userId,
      title: `Саммари за ${today}`,
      content,
      period,
      topics: extractTopics(content),
      postIds: posts.map((p) => p.id),
    },
  });

  revalidateTag("summary");
  return summary;
}
```

---

## Этап 6: Dashboard UI (День 8-11)

### 6.1 Layout и навигация

```typescript
// app/(dashboard)/layout.tsx
export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Header />
        {children}
      </main>
    </div>
  );
}
```

### 6.2 Главная страница дашборда

```typescript
// app/(dashboard)/page.tsx
import { Suspense } from 'react';

export default async function DashboardPage() {
  return (
    <div className="p-6">
      <Suspense fallback={<SummaryCardSkeleton />}>
        <TodaySummary />
      </Suspense>

      <Suspense fallback={<PostsListSkeleton />}>
        <RecentPosts />
      </Suspense>
    </div>
  );
}
```

### 6.3 Компоненты с PPR

```typescript
// components/dashboard/TodaySummary.tsx
import { unstable_noStore } from 'next/cache';

export async function TodaySummary() {
  unstable_noStore(); // Динамический контент

  const summary = await getCachedSummary(userId, today);

  return (
    <Card>
      <CardHeader>
        <h2>Саммари за сегодня</h2>
      </CardHeader>
      <CardContent>
        {summary ? (
          <SummaryContent data={summary} />
        ) : (
          <GenerateSummaryButton />
        )}
      </CardContent>
    </Card>
  );
}
```

### 6.4 Управление каналами

```typescript
// app/(dashboard)/channels/page.tsx
export default async function ChannelsPage() {
  const channels = await getChannels();

  return (
    <div>
      <h1>Мои каналы</h1>
      <AddChannelButton />
      <ChannelsList channels={channels} />
    </div>
  );
}
```

### 6.5 Просмотр саммари

```typescript
// app/(dashboard)/summaries/page.tsx
export default async function SummariesPage({ searchParams }) {
  const period = searchParams.period || 'week';
  const summaries = await getSummaries(period);

  return (
    <div>
      <PeriodFilter />
      <TopicsFilter />
      <SummariesList summaries={summaries} />
    </div>
  );
}
```

---

## Этап 7: Автоматизация и Cron Jobs (День 11-12)

### 7.1 Vercel Cron Job

```typescript
// app/api/cron/daily-summary/route.ts
export async function GET(request: Request) {
  // Проверка authorization header
  if (request.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Получить всех активных пользователей
  const users = await db.user.findMany({
    where: {
      preferences: { summaryInterval: "daily" },
    },
  });

  // Генерировать саммари для каждого
  await Promise.all(users.map((user) => generateDailySummary(user.id)));

  return Response.json({ success: true });
}
```

### 7.2 Настройка vercel.json

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-summary",
      "schedule": "0 20 * * *"
    },
    {
      "path": "/api/cron/fetch-posts",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

### 7.3 Фоновый фетчинг постов

```typescript
// app/api/cron/fetch-posts/route.ts
export async function GET() {
  const channels = await db.channel.findMany({
    where: { isActive: true },
  });

  for (const channel of channels) {
    await fetchChannelPosts(channel);
  }

  return Response.json({ processed: channels.length });
}
```

---

## Этап 8: Оптимизация и кэширование (День 12-13)

### 8.1 Использование "use cache" (Next.js 16)

```typescript
// app/(dashboard)/summaries/recent.tsx
'use cache';

export async function RecentSummaries() {
  const summaries = await db.summary.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' }
  });

  return <SummariesList summaries={summaries} />;
}
```

### 8.2 Redis кэш для частых запросов

```typescript
// lib/cache/redis.ts
import { Redis } from "@upstash/redis";

export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600
): Promise<T> {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_URL!,
    token: process.env.UPSTASH_REDIS_TOKEN!,
  });

  const cached = await redis.get(key);
  if (cached) return cached as T;

  const fresh = await fetcher();
  await redis.setex(key, ttl, fresh);
  return fresh;
}
```

### 8.3 Оптимизация запросов

- Использовать select для выборки только нужных полей
- Включить индексы в schema.prisma
- Пагинация для больших списков

---

## Этап 9: Настройки и персонализация (День 13-14)

### 9.1 Страница настроек

```typescript
// app/(dashboard)/settings/page.tsx
export default function SettingsPage() {
  return (
    <div>
      <h1>Настройки</h1>
      <PreferencesForm />
      <TopicsManagement />
      <NotificationSettings />
    </div>
  );
}
```

### 9.2 Управление темами/тегами

```typescript
// app/actions/preferences.ts
"use server";

export async function updateTopics(userId: string, topics: string[]) {
  await db.userPreferences.upsert({
    where: { userId },
    update: { topics },
    create: { userId, topics },
  });

  revalidatePath("/dashboard/settings");
}
```

### 9.3 Фильтрация контента по темам

```typescript
export async function getFilteredSummaries(userId: string, topics?: string[]) {
  const preferences = await db.userPreferences.findUnique({
    where: { userId },
  });

  const filterTopics = topics || preferences?.topics || [];

  return db.summary.findMany({
    where: {
      userId,
      topics: { hasSome: filterTopics },
    },
  });
}
```

---

## Этап 10: Тестирование (День 14-15)

### 10.1 Unit тесты

```typescript
// __tests__/lib/ai/summarizer.test.ts
import { describe, expect, it, vi } from "vitest";

import { generateSummary } from "@/lib/ai/summarizer";

describe("generateSummary", () => {
  it("should generate summary from posts", async () => {
    const posts = [{ title: "React 19", content: "..." }];

    const summary = await generateSummary(posts);
    expect(summary).toBeTruthy();
  });
});
```

### 10.2 Integration тесты

```typescript
// __tests__/api/channels.test.ts
import { POST } from "@/app/api/channels/route";

describe("POST /api/channels", () => {
  it("should create new channel", async () => {
    const request = new Request("http://localhost:3000/api/channels", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Channel",
        type: "telegram",
        sourceUrl: "t.me/testchannel",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
  });
});
```

### 10.3 E2E тесты (Playwright)

```typescript
// e2e/dashboard.spec.ts
import { expect, test } from "@playwright/test";

test("user can add channel", async ({ page }) => {
  await page.goto("/dashboard/channels");
  await page.click('button:has-text("Добавить канал")');
  await page.fill('input[name="name"]', "My Channel");
  await page.click('button:has-text("Сохранить")');

  await expect(page.locator("text=My Channel")).toBeVisible();
});
```

---

## Этап 11: Деплой и мониторинг (День 15-16)

### 11.1 Подготовка к деплою

```bash
# Проверка сборки
npm run build

# Настройка переменных окружения в Vercel
vercel env add DATABASE_URL
vercel env add OPENAI_API_KEY
# ... остальные
```

### 11.2 Настройка CI/CD

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

### 11.3 Деплой на Vercel

```bash
vercel --prod
```

### 11.4 Мониторинг

- Настроить Vercel Analytics
- Добавить error tracking (Sentry)
- Настроить логирование критических операций

---

## Дополнительные фичи (опционально)

### Фаза 2: Улучшения UX

- **Поиск по саммари** — full-text search через Postgres или Algolia
- **Экспорт саммари** — PDF, Markdown, Email рассылка
- **Уведомления** — push-уведомления о новых саммари
- **Мобильная версия** — PWA с оффлайн-режимом

### Фаза 3: Социальные фичи

- **Шаринг саммари** — публичные ссылки на саммари
- **Рекомендации каналов** — на основе интересов пользователя
- **Коллекции** — группировка каналов по темам
- **Комментарии** — заметки к саммари

### Фаза 4: AI улучшения

- **Кастомные промпты** — пользователь настраивает стиль саммари
- **Извлечение инсайтов** — тренды, статистика по темам
- **Автотеги** — ML для автоматической категоризации
- **Персонализированные рекомендации** — на основе истории чтения

---

## Метрики успеха

### KPI разработки

- Все основные фичи реализованы за 14-16 дней
- Покрытие тестами > 70%
- Lighthouse score > 90
- Time to First Byte < 500ms

### KPI продукта

- Пользователь может добавить канал за < 30 секунд
- Саммари генерируется за < 20 секунд
- Дашборд загружается за < 1 секунду (PPR)

---

## Риски и митигация

### Риск 1: Rate limits Telegram API

**Митигация**: Кэширование, throttling запросов, использование official API вместо скрапинга

### Риск 2: Стоимость OpenAI API

**Митигация**: Кэширование саммари, использование более дешевых моделей (GPT-3.5), переход на локальную LLM (Ollama)

### Риск 3: Slow summary generation

**Митигация**: Фоновые задачи, streaming responses, предварительная генерация

### Риск 4: Масштабирование БД

**Митигация**: Индексы, партиционирование старых данных, read replicas

---

## Контрольные точки

- **День 3**: Аутентификация работает, можно регистрироваться/логиниться
- **День 5**: Можно добавить Telegram канал и увидеть посты
- **День 8**: AI генерирует первое саммари
- **День 11**: Полностью рабочий дашборд с фильтрами
- **День 14**: Автоматизация работает, тесты проходят
- **День 16**: Приложение задеплоено в production

---

## Полезные ресурсы

- [Next.js 16 Documentation](https://nextjs.org/docs)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
