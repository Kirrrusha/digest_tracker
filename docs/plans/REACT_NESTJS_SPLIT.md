# Plan: React SPA + NestJS — разделение web на frontend и backend

> Status: **Approved**
> Created: 2026-02-18
> Priority: High

## Context

DevDigest Tracker — монорепо на pnpm workspaces с единственным приложением `apps/web` на Next.js 16.
В нём совмещены UI (dashboard, auth-страницы, Telegram mini-app) и API-маршруты (`/app/api/*`).

Текущая архитектура:

- **Монолит**: Next.js 16 — SSR/SSG UI + REST API + Server Actions
- **БД**: PostgreSQL 16 + Prisma ORM
- **Кэш**: Redis 7 (ioredis)
- **Auth**: NextAuth.js v5 (JWT strategy) — email/password, Passkey, Telegram
- **AI**: OpenAI — генерация дневных/недельных саммари
- **Telegram**: Grammy bot + MTProto (приватные каналы) + Mini App
- **Инфра**: Docker Compose, NGINX, Certbot

**Цель**: не изменяя `apps/web`, добавить в монорепо:

- `apps/api` — NestJS REST API с JWT-аутентификацией
- `apps/frontend` — React SPA на Vite (параллельный дашборд)
- `packages/shared` — общие TypeScript-типы и Zod-схемы

Next.js остаётся на порту **3000** (Telegram mini-app, mobile auth endpoint).

---

## Целевая структура монорепо

```
dev_digest_tracker/
├── apps/
│   ├── web/          ← Next.js 16, без изменений (порт 3000)
│   ├── api/          ← NEW: NestJS REST API (порт 4000)
│   ├── frontend/     ← NEW: React SPA / Vite (порт 5173)
│   └── mobile/       ← React Native / Expo, без изменений
├── packages/
│   └── shared/       ← NEW: общие типы и Zod-схемы
├── pnpm-workspace.yaml
├── package.json
├── docker-compose.dev.yml
└── docker-compose.prod.yml
```

---

## Порты

| Сервис          | Порт | Описание                        |
| --------------- | ---- | ------------------------------- |
| `apps/web`      | 3000 | Next.js (mini-app, mobile auth) |
| `apps/api`      | 4000 | NestJS REST API                 |
| `apps/frontend` | 5173 | React SPA (Vite dev server)     |
| PostgreSQL      | 5432 | База данных                     |
| Redis           | 6379 | Кэш и refresh-токены            |

---

## Фаза 1: packages/shared

Единый источник типов и схем между `apps/api` и `apps/frontend`.

### Структура

```
packages/shared/
├── package.json         (name: @devdigest/shared)
├── tsconfig.json
└── src/
    ├── index.ts         (re-exports всего)
    ├── types/
    │   ├── auth.ts
    │   ├── channel.ts
    │   ├── post.ts
    │   ├── summary.ts
    │   ├── preferences.ts
    │   └── user.ts
    └── schemas/         (Zod — валидация форм и DTO)
        ├── auth.ts
        ├── channel.ts
        ├── summary.ts
        └── preferences.ts
```

### Типы

**types/auth.ts**

```ts
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name?: string;
}

export interface UserProfile {
  id: string;
  email: string | null;
  name: string | null;
  hasTelegram: boolean;
  hasPasskey: boolean;
}
```

**types/channel.ts**

```ts
export type ChannelSourceType = "telegram" | "rss" | "telegram_bot" | "telegram_mtproto";

export interface Channel {
  id: string;
  name: string;
  sourceUrl: string;
  sourceType: ChannelSourceType;
  description?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  postsCount: number;
  lastPostAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChannelDto {
  url: string;
}
```

**types/summary.ts**

```ts
export interface Summary {
  id: string;
  title: string;
  content: string;
  period: string; // формат: "daily-2024-01-25"
  topics: string[];
  postsCount: number;
  createdAt: string;
}

export interface SummariesResponse {
  summaries: Summary[];
  total: number;
  page: number;
  hasMore: boolean;
}
```

**types/post.ts**

```ts
export interface Post {
  id: string;
  channelId: string;
  externalId: string;
  title?: string | null;
  contentPreview?: string | null;
  url?: string | null;
  author?: string | null;
  publishedAt: string;
  createdAt: string;
}
```

**types/preferences.ts**

```ts
export interface UserPreferences {
  topics: string[];
  summaryInterval: "daily" | "weekly";
  language: string;
  notificationsEnabled: boolean;
  notificationTime?: string | null;
  telegramNotifications: boolean;
  notifyOnNewSummary: boolean;
  notifyOnNewPosts: boolean;
}
```

### Zod-схемы

**schemas/auth.ts**

```ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().min(8, "Минимум 8 символов"),
});

export const registerSchema = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().min(8, "Минимум 8 символов"),
  name: z.string().min(2, "Минимум 2 символа").optional(),
});
```

**schemas/channel.ts**

```ts
import { z } from "zod";

export const createChannelSchema = z.object({
  url: z.string().url("Некорректный URL"),
});
```

### package.json

```json
{
  "name": "@devdigest/shared",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "typescript": "^5"
  }
}
```

### Изменения в pnpm-workspace.yaml

```yaml
packages:
  - apps/*
  - packages/* # ← добавить

ignoredBuiltDependencies:
  - sharp
  - unrs-resolver
```

---

## Фаза 2: apps/api (NestJS)

### Стек

| Слой       | Библиотека                                        |
| ---------- | ------------------------------------------------- |
| Framework  | `@nestjs/core`, `@nestjs/common`                  |
| Auth       | `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt` |
| ORM        | `@prisma/client` (та же БД)                       |
| Валидация  | `class-validator`, `class-transformer`            |
| Кэш        | `ioredis` (тот же Redis)                          |
| Config     | `@nestjs/config`                                  |
| Swagger    | `@nestjs/swagger`                                 |
| Шифрование | `bcryptjs`                                        |
| AI         | `openai`                                          |
| Telegram   | `grammy`, `telegram`                              |

### Структура

```
apps/api/
├── package.json          (name: @devdigest/api)
├── tsconfig.json
├── tsconfig.build.json
├── nest-cli.json
├── Dockerfile
├── Dockerfile.dev
├── .env.example
└── src/
    ├── main.ts
    ├── app.module.ts
    ├── prisma/
    │   ├── prisma.module.ts
    │   └── prisma.service.ts
    ├── auth/
    │   ├── auth.module.ts
    │   ├── auth.controller.ts
    │   ├── auth.service.ts
    │   ├── jwt.strategy.ts
    │   ├── jwt-refresh.strategy.ts
    │   ├── jwt-auth.guard.ts
    │   └── dto/
    │       ├── login.dto.ts
    │       └── register.dto.ts
    ├── passkey/
    │   ├── passkey.module.ts
    │   ├── passkey.controller.ts
    │   └── passkey.service.ts
    ├── channels/
    │   ├── channels.module.ts
    │   ├── channels.controller.ts
    │   ├── channels.service.ts
    │   └── dto/
    │       ├── create-channel.dto.ts
    │       └── update-channel.dto.ts
    ├── posts/
    │   ├── posts.module.ts
    │   ├── posts.controller.ts
    │   └── posts.service.ts
    ├── summaries/
    │   ├── summaries.module.ts
    │   ├── summaries.controller.ts
    │   ├── summaries.service.ts
    │   └── dto/
    │       └── create-summary.dto.ts
    ├── preferences/
    │   ├── preferences.module.ts
    │   ├── preferences.controller.ts
    │   ├── preferences.service.ts
    │   └── dto/
    │       └── update-preferences.dto.ts
    ├── profile/
    │   ├── profile.module.ts
    │   └── profile.controller.ts
    ├── mtproto/
    │   ├── mtproto.module.ts
    │   ├── mtproto.controller.ts
    │   └── mtproto.service.ts
    ├── telegram/
    │   ├── telegram.module.ts
    │   └── telegram.controller.ts
    ├── cron/
    │   ├── cron.module.ts
    │   └── cron.service.ts
    ├── dashboard/
    │   ├── dashboard.module.ts
    │   └── dashboard.controller.ts
    └── health/
        ├── health.module.ts
        └── health.controller.ts
```

### API Endpoints

#### Auth

| Method | Path             | Описание                              | Guard      |
| ------ | ---------------- | ------------------------------------- | ---------- |
| POST   | `/auth/register` | Регистрация email+password            | —          |
| POST   | `/auth/login`    | Логин → `{accessToken, refreshToken}` | —          |
| POST   | `/auth/refresh`  | Обновить токены                       | RefreshJWT |
| POST   | `/auth/logout`   | Инвалидировать refresh                | JWT        |
| POST   | `/auth/telegram` | Telegram OAuth                        | —          |

#### Passkeys

| Method | Path                        | Описание                        |
| ------ | --------------------------- | ------------------------------- |
| POST   | `/passkey/register/options` | WebAuthn registration options   |
| POST   | `/passkey/register/verify`  | Создать passkey                 |
| POST   | `/passkey/login/options`    | WebAuthn authentication options |
| POST   | `/passkey/login/verify`     | Войти через passkey             |

#### Channels

| Method | Path                    | Описание                    |
| ------ | ----------------------- | --------------------------- |
| GET    | `/channels`             | Список каналов пользователя |
| POST   | `/channels`             | Добавить канал              |
| GET    | `/channels/:id`         | Детали канала               |
| PUT    | `/channels/:id`         | Обновить канал              |
| DELETE | `/channels/:id`         | Удалить канал               |
| GET    | `/channels/:id/posts`   | Посты канала                |
| POST   | `/channels/:id/refresh` | Обновить посты канала       |
| POST   | `/channels/refresh`     | Обновить все каналы         |
| POST   | `/channels/validate`    | Проверить URL канала        |

#### Summaries

| Method | Path                  | Описание                           |
| ------ | --------------------- | ---------------------------------- |
| GET    | `/summaries`          | Список саммари (page, limit, type) |
| POST   | `/summaries`          | Создать вручную                    |
| GET    | `/summaries/:id`      | Детали саммари                     |
| POST   | `/summaries/generate` | AI-генерация саммари               |

#### User

| Method | Path           | Описание             |
| ------ | -------------- | -------------------- |
| GET    | `/profile`     | Профиль пользователя |
| GET    | `/preferences` | Настройки            |
| PUT    | `/preferences` | Обновить настройки   |

#### MTProto

| Method | Path                       | Описание                         |
| ------ | -------------------------- | -------------------------------- |
| POST   | `/mtproto/auth/send-code`  | Отправить код верификации        |
| POST   | `/mtproto/auth/verify`     | Подтвердить код → создать сессию |
| POST   | `/mtproto/auth/disconnect` | Отозвать MTProto-сессию          |
| GET    | `/mtproto/channels`        | Каналы доступные через MTProto   |

#### System

| Method | Path                   | Guard       | Описание             |
| ------ | ---------------------- | ----------- | -------------------- |
| GET    | `/health`              | —           | Health check         |
| GET    | `/metrics`             | —           | Метрики приложения   |
| GET    | `/dashboard/stats`     | JWT         | Статистика дашборда  |
| POST   | `/telegram/webhook`    | HMAC        | Telegram bot webhook |
| POST   | `/cron/fetch-posts`    | CRON_SECRET | Фетч постов          |
| POST   | `/cron/daily-summary`  | CRON_SECRET | Дневное саммари      |
| POST   | `/cron/weekly-summary` | CRON_SECRET | Недельное саммари    |

Swagger UI доступен на `/api/docs`.

### JWT Auth Flow

```
POST /auth/login
  → { accessToken (TTL: 15m), refreshToken (TTL: 7d) }

Каждый запрос:
  Authorization: Bearer <accessToken>
  → JwtStrategy извлекает { userId } → req.user

При истечении accessToken:
  POST /auth/refresh  { refreshToken }
  → новый accessToken + новый refreshToken (rotation)
  → старый refreshToken инвалидируется в Redis
```

Refresh-токены хранятся в Redis по ключу `refresh:<userId>:<tokenId>` с TTL = 7 дней.

### main.ts

```ts
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      "http://localhost:5173", // React frontend
      "http://localhost:3000", // Next.js
    ],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  const config = new DocumentBuilder()
    .setTitle("DevDigest API")
    .setDescription("REST API для DevDigest Tracker")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, config));

  await app.listen(process.env.PORT ?? 4000);
}

bootstrap();
```

### PrismaService

Использует тот же `DATABASE_URL`. Prisma-схема — копия `apps/web/prisma/schema.prisma`.

```ts
// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

### .env.example

```env
# App
PORT=4000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://devdigest:devdigest_password@localhost:5432/devdigest_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-jwt-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview

# Telegram
TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_USERNAME=...
TELEGRAM_WEBHOOK_SECRET=...
TELEGRAM_API_ID=...
TELEGRAM_API_HASH=...

# MTProto
MTPROTO_ENCRYPTION_KEY=...

# Cron
CRON_SECRET=...
```

### Dockerfile.dev

```dockerfile
FROM node:22-alpine
RUN npm install -g pnpm
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN pnpm install
COPY . .
WORKDIR /app/apps/api
RUN pnpm prisma generate
CMD ["pnpm", "dev"]
```

---

## Фаза 3: apps/frontend (React SPA)

### Стек

| Слой          | Библиотека                                    |
| ------------- | --------------------------------------------- |
| Bundler       | Vite 6 + `@vitejs/plugin-react`               |
| UI Framework  | React 19 + TypeScript 5                       |
| Routing       | React Router v7                               |
| Data fetching | TanStack Query v5 (`@tanstack/react-query`)   |
| HTTP          | axios (baseURL → NestJS :4000)                |
| State         | Zustand                                       |
| UI Components | shadcn/ui + Tailwind CSS v4                   |
| Forms         | react-hook-form + `@hookform/resolvers` + zod |
| Иконки        | lucide-react                                  |
| Toast         | sonner                                        |
| Markdown      | react-markdown                                |
| Тесты         | Vitest + `@testing-library/react`             |

### Структура

```
apps/frontend/
├── package.json          (name: @devdigest/frontend)
├── tsconfig.json
├── vite.config.ts
├── index.html
├── components.json       (shadcn config)
├── Dockerfile
├── Dockerfile.dev
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── router.tsx
    ├── api/
    │   ├── client.ts          (axios instance + JWT interceptors)
    │   ├── auth.ts
    │   ├── channels.ts
    │   ├── summaries.ts
    │   ├── posts.ts
    │   └── preferences.ts
    ├── stores/
    │   └── auth.store.ts      (Zustand: accessToken, refreshToken, user)
    ├── hooks/
    │   ├── useAuth.ts
    │   ├── useChannels.ts
    │   ├── useSummaries.ts
    │   └── usePosts.ts
    ├── components/
    │   ├── ui/                (shadcn/ui — скопировать из apps/web/components/ui)
    │   ├── auth/
    │   │   ├── LoginForm.tsx
    │   │   └── RegisterForm.tsx
    │   ├── channels/
    │   │   ├── ChannelCard.tsx
    │   │   ├── ChannelList.tsx
    │   │   └── AddChannelDialog.tsx
    │   ├── summaries/
    │   │   ├── SummaryCard.tsx
    │   │   └── SummaryList.tsx
    │   ├── posts/
    │   │   ├── PostCard.tsx
    │   │   └── PostList.tsx
    │   ├── dashboard/
    │   │   └── StatsCards.tsx
    │   ├── layout/
    │   │   ├── Sidebar.tsx
    │   │   ├── Header.tsx
    │   │   └── ProtectedRoute.tsx
    │   └── skeletons/
    ├── pages/
    │   ├── LoginPage.tsx
    │   ├── RegisterPage.tsx
    │   ├── DashboardPage.tsx
    │   ├── ChannelsPage.tsx
    │   ├── ChannelDetailPage.tsx
    │   ├── PostsPage.tsx
    │   ├── PostDetailPage.tsx
    │   ├── SummariesPage.tsx
    │   ├── SummaryDetailPage.tsx
    │   └── SettingsPage.tsx
    └── lib/
        └── utils.ts
```

### Маршруты

```
/login                   → LoginPage (публичный)
/register                → RegisterPage (публичный)
/                        → redirect → /dashboard
/dashboard               → DashboardPage
/channels                → ChannelsPage
/channels/:id            → ChannelDetailPage
/posts                   → PostsPage
/posts/:id               → PostDetailPage
/summaries               → SummariesPage
/summaries/:id           → SummaryDetailPage
/settings                → SettingsPage
```

Все маршруты кроме `/login` и `/register` обёрнуты в `<ProtectedRoute>` — проверяет наличие токена в Zustand/localStorage.

### axios client с JWT interceptor

```ts
// src/api/client.ts
import axios from "axios";

import { useAuthStore } from "../stores/auth.store";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // http://localhost:4000
});

// Добавляем Bearer-токен к каждому запросу
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Refresh-логика при 401
api.interceptors.response.use(null, async (error) => {
  const original = error.config;
  if (error.response?.status === 401 && !original._retry) {
    original._retry = true;
    try {
      const refreshToken = useAuthStore.getState().refreshToken;
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`, {
        refreshToken,
      });
      useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(original);
    } catch {
      useAuthStore.getState().logout();
    }
  }
  return Promise.reject(error);
});
```

### Zustand auth store

```ts
// src/stores/auth.store.ts
import type { UserProfile } from "@devdigest/shared";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  setTokens: (access: string, refresh: string) => void;
  setUser: (user: UserProfile) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: "devdigest-auth" }
  )
);
```

### vite.config.ts

```ts
import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
```

### Dockerfile.dev

```dockerfile
FROM node:22-alpine
RUN npm install -g pnpm
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/frontend/package.json ./apps/frontend/
RUN pnpm install
COPY . .
WORKDIR /app/apps/frontend
CMD ["pnpm", "dev", "--host"]
```

---

## Фаза 4: Инфраструктура

### pnpm-workspace.yaml

```yaml
packages:
  - apps/*
  - packages/*

ignoredBuiltDependencies:
  - sharp
  - unrs-resolver
```

### root package.json (дополнительные скрипты)

```json
{
  "scripts": {
    "api:dev": "pnpm --filter @devdigest/api dev",
    "api:build": "pnpm --filter @devdigest/api build",
    "api:start": "pnpm --filter @devdigest/api start",
    "api:test": "pnpm --filter @devdigest/api test",
    "frontend:dev": "pnpm --filter @devdigest/frontend dev",
    "frontend:build": "pnpm --filter @devdigest/frontend build",
    "frontend:preview": "pnpm --filter @devdigest/frontend preview"
  }
}
```

### docker-compose.dev.yml (дополнительные сервисы)

```yaml
api:
  build:
    context: .
    dockerfile: apps/api/Dockerfile.dev
  container_name: devdigest_api_dev
  restart: unless-stopped
  ports:
    - "4000:4000"
  environment:
    - DATABASE_URL=postgresql://devdigest:devdigest_password@postgres:5432/devdigest_db
    - REDIS_URL=redis://redis:6379
    - JWT_SECRET=${JWT_SECRET}
    - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
    - JWT_EXPIRES_IN=15m
    - JWT_REFRESH_EXPIRES_IN=7d
    - OPENAI_API_KEY=${OPENAI_API_KEY}
    - OPENAI_BASE_URL=${OPENAI_BASE_URL}
    - OPENAI_MODEL=${OPENAI_MODEL:-gpt-4-turbo-preview}
    - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
    - TELEGRAM_BOT_USERNAME=${TELEGRAM_BOT_USERNAME}
    - TELEGRAM_WEBHOOK_SECRET=${TELEGRAM_WEBHOOK_SECRET}
    - TELEGRAM_API_ID=${TELEGRAM_API_ID}
    - TELEGRAM_API_HASH=${TELEGRAM_API_HASH}
    - MTPROTO_ENCRYPTION_KEY=${MTPROTO_ENCRYPTION_KEY}
    - CRON_SECRET=${CRON_SECRET}
    - NODE_ENV=development
  volumes:
    - .:/app
    - /app/node_modules
    - /app/apps/api/node_modules
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy

frontend:
  build:
    context: .
    dockerfile: apps/frontend/Dockerfile.dev
  container_name: devdigest_frontend_dev
  restart: unless-stopped
  ports:
    - "5173:5173"
  environment:
    - VITE_API_URL=http://localhost:4000
  volumes:
    - .:/app
    - /app/node_modules
    - /app/apps/frontend/node_modules
  depends_on:
    - api
```

---

## Порядок реализации

### Итерация 1 — packages/shared

- [ ] Создать `packages/shared/` с `package.json`, `tsconfig.json`
- [ ] Написать типы: `auth`, `channel`, `post`, `summary`, `preferences`, `user`
- [ ] Написать Zod-схемы: `auth`, `channel`, `preferences`
- [ ] Обновить `pnpm-workspace.yaml`
- [ ] `pnpm install` — проверить что shared резолвится

### Итерация 2 — apps/api (NestJS)

- [ ] Создать структуру `apps/api/` (файлы вручную)
- [ ] `PrismaModule` + `PrismaService` (подключение к той же БД)
- [ ] `AuthModule` — JWT стратегия, регистрация, логин, refresh, logout
- [ ] `ChannelsModule` — CRUD + refresh постов (перенести логику из `apps/web/lib/parsers`)
- [ ] `SummariesModule` — CRUD + AI-генерация (перенести из `apps/web/lib/ai`)
- [ ] `PreferencesModule`, `ProfileModule`
- [ ] `MtprotoModule` (перенести из `apps/web/lib/mtproto`)
- [ ] `TelegramModule` (webhook)
- [ ] `CronModule` (защита через CRON_SECRET header)
- [ ] `HealthModule`, настройка Swagger
- [ ] `Dockerfile.dev`
- [ ] Добавить в `docker-compose.dev.yml`

### Итерация 3 — apps/frontend (React SPA)

- [ ] Создать приложение: `pnpm create vite apps/frontend --template react-ts`
- [ ] Настроить Tailwind CSS v4, shadcn/ui
- [ ] Скопировать `components/ui/` из `apps/web`
- [ ] Настроить React Router, Zustand, TanStack Query
- [ ] `api/client.ts` — axios с JWT interceptors
- [ ] `LoginPage`, `RegisterPage`
- [ ] `DashboardPage` — статистика
- [ ] `ChannelsPage`, `ChannelDetailPage`
- [ ] `SummariesPage`, `SummaryDetailPage`
- [ ] `PostsPage`, `PostDetailPage`
- [ ] `SettingsPage`
- [ ] `Dockerfile.dev`
- [ ] Добавить в `docker-compose.dev.yml`

### Итерация 4 — Инфраструктура

- [ ] Обновить root `package.json` скриптами
- [ ] Создать `.env.example` для `apps/api`
- [ ] Настроить CORS в NestJS
- [ ] Проверить end-to-end через Docker Compose

---

## Проверка работоспособности

```bash
# 1. Зависимости
pnpm install

# 2. NestJS
pnpm api:dev
curl http://localhost:4000/health
# → {"status":"ok"}

# 3. Swagger
# Открыть http://localhost:4000/api/docs

# 4. Auth flow
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
# → {"accessToken":"...", "refreshToken":"..."}

# 5. Channels
curl http://localhost:4000/channels \
  -H "Authorization: Bearer <accessToken>"
# → []

# 6. React frontend
pnpm frontend:dev
# Открыть http://localhost:5173

# 7. Next.js работает независимо
curl http://localhost:3000/api/health
# → {"status":"ok"}
```

---

## Зависимости между приложениями

```
apps/frontend  →  @devdigest/shared  (типы)
apps/api       →  @devdigest/shared  (типы)
apps/frontend  →  apps/api           (HTTP, порт 4000)
apps/web       →  независимо         (порт 3000)
apps/api       →  PostgreSQL         (та же БД что и apps/web)
apps/api       →  Redis              (тот же Redis)
apps/web       →  PostgreSQL         (без изменений)
apps/web       →  Redis              (без изменений)
```
