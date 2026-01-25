# Руководство по настройке DevDigest Tracker

## Быстрый старт

### Шаг 1: Запуск Docker контейнеров

```bash
# Запустить PostgreSQL и Redis
docker-compose up -d

# Проверить статус
docker-compose ps

# Посмотреть логи
docker-compose logs -f postgres
```

### Шаг 2: Создание Next.js проекта

```bash
# Создать проект с TypeScript и Tailwind
pnpm create next-app@latest . --typescript --tailwind --app --src-dir=false --import-alias="@/*"

# Или если директория не пустая
pnpm create next-app@latest devdigest --typescript --tailwind --app
cd devdigest
```

### Шаг 3: Установка зависимостей

```bash
# База данных
pnpm install prisma @prisma/client
pnpm install -D prisma

# Аутентификация NextAuth.js v5
pnpm install next-auth@beta bcryptjs
pnpm install -D @types/bcryptjs

# Парсинг контента
pnpm install grammy rss-parser

# AI для саммари
pnpm install openai

# UI библиотеки
pnpm install lucide-react date-fns zod react-markdown
pnpm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu

# Redis клиент
pnpm install ioredis
pnpm install -D @types/ioredis

# Cron для фоновых задач
pnpm install node-cron
pnpm install -D @types/node-cron

# Toast уведомления
pnpm install sonner

# Темная тема
pnpm install next-themes
```

### Шаг 4: Настройка окружения

```bash
# Скопировать пример
cp .env.example .env.local

# Сгенерировать секретный ключ для NextAuth
openssl rand -base64 32
```

Отредактируйте `.env.local`:

```env
DATABASE_URL="postgresql://devdigest:devdigest_password@localhost:5432/devdigest_db"
NEXTAUTH_SECRET="ваш-сгенерированный-секрет"
NEXTAUTH_URL="http://localhost:3000"

# Получить токен от @BotFather в Telegram
TELEGRAM_BOT_TOKEN="your-bot-token"

# Получить на https://platform.openai.com/api-keys
OPENAI_API_KEY="sk-your-key"
```

---

## Настройка Prisma

### 1. Инициализация

```bash
pnpm exec prisma init
```

### 2. Схема базы данных

Создайте файл `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Пользователи
model User {
  id            String           @id @default(cuid())
  email         String           @unique
  name          String?
  passwordHash  String
  emailVerified DateTime?
  image         String?
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  channels      Channel[]
  summaries     Summary[]
  preferences   UserPreferences?
  sessions      Session[]
  accounts      Account[]
}

// Для NextAuth.js
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// Настройки пользователя
model UserPreferences {
  id              String   @id @default(cuid())
  userId          String   @unique
  topics          String[] // Избранные темы (React, TS, etc)
  summaryInterval String   @default("daily") // daily, weekly, manual
  summaryTime     String   @default("20:00") // Время генерации саммари
  language        String   @default("ru")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// Каналы/источники
model Channel {
  id          String    @id @default(cuid())
  userId      String
  name        String
  type        String    // telegram, rss
  sourceUrl   String    // URL канала или RSS
  telegramId  String?   // ID Telegram канала (если известен)
  isActive    Boolean   @default(true)
  tags        String[]  // Категории (frontend, backend, etc)
  lastFetchedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  user  User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  posts Post[]

  @@index([userId, isActive])
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

  channel   Channel   @relation(fields: [channelId], references: [id], onDelete: Cascade)
  summaries Summary[]

  @@unique([channelId, externalId])
  @@index([channelId, publishedAt])
}

// Саммари
model Summary {
  id          String    @id @default(cuid())
  userId      String
  title       String
  content     String    @db.Text
  topics      String[]  // Выделенные темы
  period      String    // daily-2024-01-25, weekly-2024-W04
  postIds     String[]  // ID постов, которые вошли в саммари
  createdAt   DateTime  @default(now())

  user  User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  posts Post[]

  @@unique([userId, period])
  @@index([userId, createdAt])
}
```

### 3. Создание миграции и применение

```bash
# Создать миграцию
pnpm exec prisma migrate dev --name init

# Сгенерировать Prisma Client
pnpm exec prisma generate

# Открыть Prisma Studio для просмотра данных
pnpm exec prisma studio
```

---

## Настройка NextAuth.js v5

### 1. Создать файл конфигурации

Создайте `lib/auth.ts`:

```typescript
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { db } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    signOut: "/",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: {
            email: credentials.email as string,
          },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isPasswordValid = await compare(credentials.password as string, user.passwordHash);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
```

### 2. Создать Prisma клиент

Создайте `lib/db.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
```

### 3. Создать API роуты для NextAuth

Создайте `app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

### 4. Создать middleware для защиты роутов

Создайте `middleware.ts` в корне проекта:

```typescript
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage =
    req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/register");

  if (isAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn && req.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

### 5. Типы для NextAuth

Создайте `types/next-auth.d.ts`:

```typescript
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
  }
}
```

---

## Настройка Telegram Bot

### 1. Создание бота

1. Найдите @BotFather в Telegram
2. Отправьте `/newbot`
3. Следуйте инструкциям
4. Сохраните токен в `.env.local`

### 2. Настройка бота для парсинга каналов

Создайте `lib/telegram/client.ts`:

```typescript
import { Bot } from "grammy";

export class TelegramService {
  private bot: Bot;

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error("TELEGRAM_BOT_TOKEN is not defined");
    }
    this.bot = new Bot(token);
  }

  async getChannelInfo(channelUsername: string) {
    try {
      const chat = await this.bot.api.getChat(`@${channelUsername}`);
      return {
        id: chat.id.toString(),
        title: chat.type !== "private" ? chat.title : channelUsername,
        type: chat.type,
      };
    } catch (error) {
      console.error("Error getting channel info:", error);
      throw error;
    }
  }

  async getChannelPosts(channelId: string, limit: number = 100) {
    // Telegram Bot API не позволяет получать историю сообщений публичных каналов
    // Нужно использовать Telegram Client API (MTProto) или RSS мост
    // Для простоты используйте RSS: https://rsshub.app/telegram/channel/{username}
    throw new Error("Use RSS feed for Telegram channels");
  }
}
```

**Важно**: Для парсинга Telegram каналов рекомендуется использовать RSS мосты:

- https://rsshub.app/telegram/channel/{username}
- https://tg.i-c-a.su/rss/{username}

---

## Настройка OpenAI

Создайте `lib/ai/summarizer.ts`:

```typescript
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateSummary(
  posts: Array<{
    title?: string;
    content: string;
    publishedAt: Date;
    channel: { name: string };
  }>
) {
  const postsText = posts
    .map((post, idx) => {
      return `
${idx + 1}. [${post.channel.name}] ${post.title || "Без заголовка"}
Дата: ${post.publishedAt.toLocaleDateString("ru")}
Содержание: ${post.content.slice(0, 500)}...
    `.trim();
    })
    .join("\n\n");

  const prompt = `
Ты — ассистент для разработчиков. Проанализируй посты из каналов по программированию за сегодня и создай краткое саммари.

Посты:
${postsText}

Задача:
1. Сгруппируй посты по темам (React, TypeScript, Node.js, DevOps и т.д.)
2. Для каждой темы напиши краткое саммари (2-3 предложения)
3. Выдели самые важные моменты списком
4. Формат ответа: Markdown с заголовками ## для тем

Пиши кратко и по делу. Фокусируйся на практической пользе.
  `.trim();

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content:
          "Ты — помощник разработчика, который создаёт краткие саммари технических статей и новостей.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });

  const content = response.choices[0].message.content || "";

  // Извлечь темы из заголовков
  const topics = extractTopics(content);

  return {
    content,
    topics,
  };
}

function extractTopics(markdown: string): string[] {
  const headingRegex = /^##\s+(.+)$/gm;
  const topics: string[] = [];
  let match;

  while ((match = headingRegex.exec(markdown)) !== null) {
    topics.push(match[1].trim());
  }

  return topics;
}
```

---

## Настройка Redis кэширования

Создайте `lib/cache/redis.ts`:

```typescript
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600
): Promise<T> {
  // Попытка получить из кэша
  const cached = await redis.get(key);

  if (cached) {
    return JSON.parse(cached) as T;
  }

  // Если нет в кэше, выполнить fetcher
  const fresh = await fetcher();

  // Сохранить в кэш
  await redis.setex(key, ttl, JSON.stringify(fresh));

  return fresh;
}

export async function invalidateCache(pattern: string) {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

export { redis };
```

---

## Структура директорий проекта

```
devdigest/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── channels/
│   │   │   └── page.tsx
│   │   ├── summaries/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts
│   │   ├── cron/
│   │   │   ├── daily-summary/
│   │   │   │   └── route.ts
│   │   │   └── fetch-posts/
│   │   │       └── route.ts
│   │   └── channels/
│   │       └── route.ts
│   ├── actions/
│   │   ├── auth.ts
│   │   ├── channels.ts
│   │   └── summaries.ts
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   ├── dashboard/
│   ├── channels/
│   ├── summaries/
│   └── auth/
├── lib/
│   ├── auth.ts
│   ├── db.ts
│   ├── telegram/
│   │   └── client.ts
│   ├── ai/
│   │   └── summarizer.ts
│   ├── parsers/
│   │   ├── telegram.ts
│   │   └── rss.ts
│   ├── cache/
│   │   └── redis.ts
│   └── utils.ts
├── types/
│   └── next-auth.d.ts
├── prisma/
│   └── schema.prisma
├── docker-compose.yml
├── .env.example
├── .env.local (не коммитить)
└── package.json
```

---

## Команды для разработки

```bash
# Запуск в режиме разработки
pnpm dev

# Применить миграции
pnpm exec prisma migrate dev

# Открыть Prisma Studio
pnpm exec prisma studio

# Сборка для production
pnpm build

# Линтинг
pnpm lint

# Форматирование кода
pnpm exec prettier --write .
```

---

## Проверка установки

### 1. Проверить Docker

```bash
docker-compose ps
# Должны быть запущены: postgres, redis
```

### 2. Проверить подключение к БД

```bash
pnpm exec prisma studio
# Должен открыться в браузере
```

### 3. Проверить переменные окружения

```bash
# В Node.js консоли
node -e "require('dotenv').config({path: '.env.local'}); console.log(process.env.DATABASE_URL)"
```

### 4. Запустить dev сервер

```bash
pnpm dev
# Открыть http://localhost:3000
```

---

## Решение частых проблем

### Ошибка подключения к PostgreSQL

```bash
# Проверить что контейнер запущен
docker ps | grep postgres

# Посмотреть логи
docker logs devdigest_postgres

# Перезапустить
docker-compose restart postgres
```

### Ошибка Prisma Client

```bash
# Сгенерировать заново
pnpm exec prisma generate

# Очистить кэш
rm -rf node_modules/.prisma
pnpm install
```

### NextAuth не работает

Проверьте:

1. `NEXTAUTH_SECRET` установлен в `.env.local`
2. `NEXTAUTH_URL` правильный (http://localhost:3000)
3. Миграции применены (`pnpm exec prisma migrate dev`)

---

## Следующие шаги

1. ✅ Запустить Docker контейнеры
2. ✅ Настроить Next.js проект
3. ✅ Установить зависимости
4. ✅ Настроить Prisma и NextAuth
5. → Создать страницы аутентификации
6. → Создать дашборд
7. → Добавить интеграцию с Telegram/RSS
8. → Настроить AI саммари
9. → Добавить cron задачи

См. подробный план в [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md)
