# Интеграция Telegram Bot и Mini App

## Обзор

Расширение DevDigest Tracker с добавлением Telegram бота и запуском веб-приложения как Telegram Mini App для бесшовной интеграции с мессенджером.

## Архитектура решения

```
┌─────────────────────┐
│  Telegram Client    │
│                     │
│  ┌───────────────┐  │
│  │   Mini App    │◄─┼──── Web View (Next.js App)
│  └───────────────┘  │
│         ▲           │
│         │           │
│  ┌──────▼────────┐  │
│  │   Telegram    │  │
│  │     Bot       │  │
│  └───────────────┘  │
└──────────┬──────────┘
           │
           ▼
    ┌──────────────┐
    │   Next.js    │
    │   Backend    │
    │              │
    │  • API       │
    │  • Webhook   │
    │  • DB        │
    └──────────────┘
```

## Часть 1: Telegram Bot

### 1.1 Функциональность бота

#### Основные команды:

- `/start` - регистрация и приветствие
- `/subscribe <channel>` - подписаться на Telegram канал
- `/unsubscribe <channel>` - отписаться от канала
- `/list` - список моих каналов
- `/summary` - получить саммари за сегодня
- `/settings` - настройки (темы, язык)
- `/help` - справка

#### Интерактивные возможности:

- **Inline кнопки** - управление подписками
- **Inline queries** - поиск каналов для подписки
- **Keyboard меню** - быстрый доступ к функциям
- **Уведомления** - автоматическая отправка саммари

### 1.2 Структура файлов бота

```
lib/
├── telegram/
│   ├── bot.ts              # Основной класс бота
│   ├── handlers/
│   │   ├── commands.ts     # Обработчики команд
│   │   ├── callbacks.ts    # Обработчики callback queries
│   │   └── messages.ts     # Обработчики текстовых сообщений
│   ├── keyboards/
│   │   ├── inline.ts       # Inline клавиатуры
│   │   └── reply.ts        # Reply клавиатуры
│   ├── utils/
│   │   ├── formatter.ts    # Форматирование сообщений (Markdown)
│   │   └── validation.ts   # Валидация input
│   └── types.ts            # TypeScript типы для бота
```

### 1.3 Реализация бота

```typescript
// lib/telegram/bot.ts
import TelegramBot from "node-telegram-bot-api";

import { db } from "@/lib/db";

import { registerCallbacks } from "./handlers/callbacks";
import { registerCommands } from "./handlers/commands";

export class DevDigestBot {
  private bot: TelegramBot;

  constructor() {
    this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, {
      polling: process.env.NODE_ENV === "development",
    });

    this.setupHandlers();
  }

  private setupHandlers() {
    registerCommands(this.bot);
    registerCallbacks(this.bot);
  }

  // Отправка саммари пользователю
  async sendSummary(telegramId: string, summary: string) {
    await this.bot.sendMessage(telegramId, summary, {
      parse_mode: "Markdown",
      disable_web_page_preview: false,
    });
  }

  // Отправка уведомления о новом саммари
  async notifyNewSummary(userId: string, summaryId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { telegramAccount: true },
    });

    if (!user?.telegramAccount) return;

    const summary = await db.summary.findUnique({
      where: { id: summaryId },
    });

    await this.bot.sendMessage(
      user.telegramAccount.telegramId,
      `🔔 *Новое саммари готово!*\n\n${summary?.title}`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📖 Читать",
                web_app: { url: `${process.env.APP_URL}/summaries/${summaryId}` },
              },
              { text: "📱 Открыть Mini App", web_app: { url: process.env.MINI_APP_URL! } },
            ],
          ],
        },
      }
    );
  }

  getBot() {
    return this.bot;
  }
}

export const devDigestBot = new DevDigestBot();
```

```typescript
// lib/telegram/handlers/commands.ts
import TelegramBot from "node-telegram-bot-api";

import { db } from "@/lib/db";

import { channelsKeyboard } from "../keyboards/inline";
import { mainKeyboard, settingsKeyboard } from "../keyboards/reply";

export function registerCommands(bot: TelegramBot) {
  // /start - регистрация пользователя
  bot.onText(/\/start/, async (msg) => {
    const telegramId = msg.from!.id.toString();
    const username = msg.from!.username;
    const firstName = msg.from!.first_name;

    // Проверяем, есть ли пользователь
    let user = await db.user.findFirst({
      where: { telegramAccount: { telegramId } },
    });

    if (!user) {
      // Создаем нового пользователя
      user = await db.user.create({
        data: {
          name: firstName,
          telegramAccount: {
            create: {
              telegramId,
              username,
            },
          },
        },
      });
    }

    await bot.sendMessage(
      msg.chat.id,
      `👋 Привет, ${firstName}!\n\n` +
        `Я помогу тебе отслеживать интересный контент по программированию.\n\n` +
        `Что я умею:\n` +
        `• 📱 Парсить Telegram каналы и RSS\n` +
        `• 🤖 Генерировать AI саммари\n` +
        `• 🎯 Фильтровать по темам\n` +
        `• 📊 Показывать аналитику\n\n` +
        `Используй команды или открывай Mini App для удобной работы!`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          keyboard: mainKeyboard,
          resize_keyboard: true,
        },
      }
    );
  });

  // /subscribe - подписка на канал
  bot.onText(/\/subscribe (.+)/, async (msg, match) => {
    const channelUrl = match![1];
    const telegramId = msg.from!.id.toString();

    try {
      const user = await db.user.findFirst({
        where: { telegramAccount: { telegramId } },
      });

      if (!user) {
        await bot.sendMessage(msg.chat.id, "❌ Сначала выполни /start");
        return;
      }

      // Парсим канал и добавляем в БД
      const channel = await db.channel.create({
        data: {
          userId: user.id,
          name: extractChannelName(channelUrl),
          type: "telegram",
          sourceUrl: channelUrl,
          telegramId: extractTelegramId(channelUrl),
          isActive: true,
        },
      });

      await bot.sendMessage(
        msg.chat.id,
        `✅ Канал *${channel.name}* добавлен!\n\nТеперь я буду отслеживать новые посты.`,
        { parse_mode: "Markdown" }
      );

      // Запускаем первичный парсинг
      await fetchChannelPosts(channel.id);
    } catch (error) {
      await bot.sendMessage(
        msg.chat.id,
        "❌ Не удалось добавить канал. Проверь URL и попробуй снова."
      );
    }
  });

  // /list - список каналов
  bot.onText(/\/list/, async (msg) => {
    const telegramId = msg.from!.id.toString();

    const user = await db.user.findFirst({
      where: { telegramAccount: { telegramId } },
      include: { channels: true },
    });

    if (!user?.channels.length) {
      await bot.sendMessage(
        msg.chat.id,
        "📭 У тебя пока нет добавленных каналов.\n\nИспользуй /subscribe для добавления."
      );
      return;
    }

    await bot.sendMessage(msg.chat.id, "📋 *Твои каналы:*", {
      parse_mode: "Markdown",
      reply_markup: channelsKeyboard(user.channels),
    });
  });

  // /summary - получить саммари
  bot.onText(/\/summary/, async (msg) => {
    const telegramId = msg.from!.id.toString();

    const user = await db.user.findFirst({
      where: { telegramAccount: { telegramId } },
    });

    if (!user) {
      await bot.sendMessage(msg.chat.id, "❌ Сначала выполни /start");
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const summary = await db.summary.findFirst({
      where: {
        userId: user.id,
        period: `daily-${today}`,
      },
    });

    if (!summary) {
      await bot.sendMessage(
        msg.chat.id,
        "🤖 Саммари за сегодня еще не готово.\n\nСгенерировать сейчас?",
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✅ Да, сгенерировать", callback_data: "generate_summary" },
                { text: "❌ Отмена", callback_data: "cancel" },
              ],
            ],
          },
        }
      );
      return;
    }

    await bot.sendMessage(msg.chat.id, formatSummary(summary), {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "📱 Открыть в Mini App",
              web_app: { url: `${process.env.MINI_APP_URL}/summaries/${summary.id}` },
            },
          ],
        ],
      },
    });
  });

  // /settings - настройки
  bot.onText(/\/settings/, async (msg) => {
    await bot.sendMessage(msg.chat.id, "⚙️ *Настройки*\n\nВыбери, что хочешь настроить:", {
      parse_mode: "Markdown",
      reply_markup: settingsKeyboard,
    });
  });

  // /help - справка
  bot.onText(/\/help/, async (msg) => {
    await bot.sendMessage(
      msg.chat.id,
      `📖 *Справка по командам*\n\n` +
        `/start - начать работу\n` +
        `/subscribe <url> - подписаться на канал\n` +
        `/unsubscribe <name> - отписаться от канала\n` +
        `/list - мои каналы\n` +
        `/summary - саммари за сегодня\n` +
        `/settings - настройки\n` +
        `/help - эта справка\n\n` +
        `💡 Используй кнопки меню или открой Mini App для удобной работы!`,
      { parse_mode: "Markdown" }
    );
  });
}

// Вспомогательные функции
function extractChannelName(url: string): string {
  const match = url.match(/t\.me\/([^\/]+)/);
  return match ? match[1] : "Unknown Channel";
}

function extractTelegramId(url: string): string | null {
  const match = url.match(/t\.me\/([^\/]+)/);
  return match ? match[1] : null;
}

function formatSummary(summary: any): string {
  return (
    `📊 *${summary.title}*\n\n` + `${summary.content}\n\n` + `📌 Темы: ${summary.topics.join(", ")}`
  );
}
```

```typescript
// lib/telegram/keyboards/inline.ts
import { InlineKeyboardMarkup } from "node-telegram-bot-api";

export function channelsKeyboard(channels: any[]): InlineKeyboardMarkup {
  return {
    inline_keyboard: channels.map((channel) => [
      {
        text: `${channel.isActive ? "✅" : "⏸"} ${channel.name}`,
        callback_data: `channel_${channel.id}`,
      },
    ]),
  };
}

export function summaryActionsKeyboard(summaryId: string): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: "📱 Открыть в Mini App",
          web_app: { url: `${process.env.MINI_APP_URL}/summaries/${summaryId}` },
        },
      ],
      [
        { text: "📤 Поделиться", switch_inline_query: summaryId },
        { text: "💾 Сохранить", callback_data: `save_${summaryId}` },
      ],
    ],
  };
}
```

### 1.4 Webhook для бота

```typescript
// app/api/telegram/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";

import { devDigestBot } from "@/lib/telegram/bot";

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    const bot = devDigestBot.getBot();

    // Обработка update
    await bot.processUpdate(update);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Настройка webhook (вызывать при деплое)
export async function GET() {
  const webhookUrl = `${process.env.APP_URL}/api/telegram/webhook`;
  const bot = devDigestBot.getBot();

  await bot.setWebHook(webhookUrl);

  return NextResponse.json({
    message: "Webhook set",
    url: webhookUrl,
  });
}
```

---

## Часть 2: Telegram Mini App

### 2.1 Что такое Telegram Mini App?

Telegram Mini App - это веб-приложение, которое открывается внутри Telegram и имеет доступ к специальному Telegram WebApp API.

**Возможности:**

- Доступ к данным пользователя Telegram (без доп. авторизации)
- Нативные кнопки и UI элементы
- Главная кнопка (MainButton)
- Haptic feedback
- Доступ к QR сканеру, буферу обмена
- Оплаты через Telegram Payments

### 2.2 Настройка Mini App

#### Шаг 1: Создание Mini App через BotFather

```
/newapp
@YourBotUsername
My DevDigest App
Short description of app
Upload photo (640x360)
Upload GIF demo (optional)
https://your-domain.com/mini-app
```

#### Шаг 2: Подключение Telegram WebApp SDK

```typescript
// app/mini-app/layout.tsx
import Script from 'next/script';

export default function MiniAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

#### Шаг 3: Создание TypeScript типов

```typescript
// lib/telegram/webapp-types.ts
declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: WebAppInitData;
  version: string;
  platform: string;
  colorScheme: "light" | "dark";
  themeParams: ThemeParams;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;

  // Методы
  ready(): void;
  expand(): void;
  close(): void;

  // Main Button
  MainButton: MainButton;

  // Back Button
  BackButton: BackButton;

  // Haptic Feedback
  HapticFeedback: HapticFeedback;

  // События
  onEvent(eventType: string, callback: () => void): void;
  offEvent(eventType: string, callback: () => void): void;

  // Утилиты
  sendData(data: string): void;
  openLink(url: string): void;
  openTelegramLink(url: string): void;
  showPopup(params: PopupParams): void;
  showAlert(message: string): void;
  showConfirm(message: string): void;
}

export interface WebAppInitData {
  query_id?: string;
  user?: WebAppUser;
  receiver?: WebAppUser;
  chat?: WebAppChat;
  start_param?: string;
  auth_date: number;
  hash: string;
}

export interface WebAppUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

export interface MainButton {
  text: string;
  color: string;
  textColor: string;
  isVisible: boolean;
  isActive: boolean;
  isProgressVisible: boolean;

  setText(text: string): void;
  onClick(callback: () => void): void;
  offClick(callback: () => void): void;
  show(): void;
  hide(): void;
  enable(): void;
  disable(): void;
  showProgress(leaveActive?: boolean): void;
  hideProgress(): void;
}
```

### 2.3 React Hook для работы с Telegram WebApp

```typescript
// lib/telegram/useTelegramWebApp.ts
"use client";

import { useEffect, useState } from "react";

import { TelegramWebApp, WebAppUser } from "./webapp-types";

export function useTelegramWebApp() {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<WebAppUser | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (tg) {
      tg.ready();
      tg.expand();

      setWebApp(tg);
      setUser(tg.initDataUnsafe.user || null);

      // Настройка темы
      document.documentElement.style.setProperty(
        "--tg-theme-bg-color",
        tg.themeParams.bg_color || "#ffffff"
      );
    }
  }, []);

  return { webApp, user, isReady: !!webApp };
}
```

### 2.4 Компоненты Mini App

```typescript
// app/mini-app/page.tsx
'use client';

import { useEffect } from 'react';
import { useTelegramWebApp } from '@/lib/telegram/useTelegramWebApp';
import { DashboardMiniApp } from '@/components/mini-app/DashboardMiniApp';
import { LoadingScreen } from '@/components/mini-app/LoadingScreen';

export default function MiniAppPage() {
  const { webApp, user, isReady } = useTelegramWebApp();

  useEffect(() => {
    if (!webApp) return;

    // Настройка главной кнопки
    webApp.MainButton.setText('Создать саммари');
    webApp.MainButton.onClick(() => {
      // Логика создания саммари
      console.log('Creating summary...');
    });

    // Настройка кнопки назад
    webApp.BackButton.onClick(() => {
      webApp.close();
    });

    return () => {
      webApp.MainButton.hide();
      webApp.BackButton.hide();
    };
  }, [webApp]);

  if (!isReady) {
    return <LoadingScreen />;
  }

  return (
    <main className="min-h-screen bg-[var(--tg-theme-bg-color)]">
      <DashboardMiniApp user={user!} />
    </main>
  );
}
```

```typescript
// components/mini-app/DashboardMiniApp.tsx
'use client';

import { useState, useEffect } from 'react';
import { WebAppUser } from '@/lib/telegram/webapp-types';
import { useTelegramWebApp } from '@/lib/telegram/useTelegramWebApp';

interface Props {
  user: WebAppUser;
}

export function DashboardMiniApp({ user }: Props) {
  const { webApp } = useTelegramWebApp();
  const [summaries, setSummaries] = useState([]);

  const handleGenerateSummary = async () => {
    if (!webApp) return;

    webApp.MainButton.showProgress();
    webApp.HapticFeedback.impactOccurred('medium');

    try {
      const response = await fetch('/api/summaries/generate', {
        method: 'POST',
        headers: {
          'X-Telegram-Init-Data': webApp.initData,
        },
      });

      const summary = await response.json();

      webApp.HapticFeedback.notificationOccurred('success');
      webApp.showAlert('Саммари создано!');

      // Обновляем список
      fetchSummaries();

    } catch (error) {
      webApp.HapticFeedback.notificationOccurred('error');
      webApp.showAlert('Ошибка при создании саммари');
    } finally {
      webApp.MainButton.hideProgress();
    }
  };

  useEffect(() => {
    fetchSummaries();
  }, []);

  const fetchSummaries = async () => {
    // Загрузка саммари для пользователя
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">
        Привет, {user.first_name}! 👋
      </h1>

      <div className="space-y-4">
        {/* Список саммари */}
      </div>
    </div>
  );
}
```

### 2.5 Аутентификация через Telegram

```typescript
// lib/telegram/auth.ts
import crypto from "crypto";

export function validateTelegramWebAppData(initData: string): boolean {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get("hash");
  urlParams.delete("hash");

  const dataCheckString = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();

  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  return calculatedHash === hash;
}

export async function getUserFromTelegramData(initData: string) {
  if (!validateTelegramWebAppData(initData)) {
    throw new Error("Invalid Telegram data");
  }

  const urlParams = new URLSearchParams(initData);
  const userJson = urlParams.get("user");

  if (!userJson) {
    throw new Error("No user data");
  }

  const telegramUser = JSON.parse(userJson);

  // Найти или создать пользователя
  let user = await db.user.findFirst({
    where: { telegramAccount: { telegramId: telegramUser.id.toString() } },
  });

  if (!user) {
    user = await db.user.create({
      data: {
        name: telegramUser.first_name,
        telegramAccount: {
          create: {
            telegramId: telegramUser.id.toString(),
            username: telegramUser.username,
          },
        },
      },
    });
  }

  return user;
}
```

```typescript
// app/api/summaries/generate/route.ts
import { NextRequest, NextResponse } from "next/server";

import { generateDailySummary } from "@/lib/ai/summarizer";
import { getUserFromTelegramData } from "@/lib/telegram/auth";

export async function POST(req: NextRequest) {
  try {
    const initData = req.headers.get("X-Telegram-Init-Data");

    if (!initData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserFromTelegramData(initData);
    const summary = await generateDailySummary(user.id);

    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

---

## Часть 3: Обновление схемы БД

```prisma
// prisma/schema.prisma

// Добавить модель для Telegram аккаунтов
model TelegramAccount {
  id          String    @id @default(cuid())
  userId      String    @unique
  telegramId  String    @unique  // Telegram User ID
  username    String?
  firstName   String?
  lastName    String?
  photoUrl    String?
  languageCode String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([telegramId])
}

// Обновить модель User
model User {
  id              String             @id @default(cuid())
  email           String?            @unique
  name            String?
  passwordHash    String?            // Опционально для Telegram пользователей
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  channels        Channel[]
  preferences     UserPreferences?
  telegramAccount TelegramAccount?

  @@index([email])
}

// Добавить поле для уведомлений
model UserPreferences {
  id                    String   @id @default(cuid())
  userId                String   @unique
  topics                String[]
  summaryInterval       String   @default("daily")
  language              String   @default("ru")

  // Telegram настройки
  telegramNotifications Boolean  @default(true)
  notifyOnNewSummary    Boolean  @default(true)
  notifyOnNewPosts      Boolean  @default(false)

  user                  User     @relation(fields: [userId], references: [id])
}
```

---

## Часть 4: Настройка окружения

```bash
# .env.local

# Telegram Bot
TELEGRAM_BOT_TOKEN="your-bot-token-from-botfather"

# Mini App
MINI_APP_URL="https://yourdomain.com/mini-app"
APP_URL="https://yourdomain.com"

# Webhook (для production)
TELEGRAM_WEBHOOK_SECRET="random-secret-string"
```

---

## Часть 5: Деплой и запуск

### 5.1 Development режим

```bash
# Запустить бота в polling режиме
pnpm dev

# Бот автоматически начнет polling при NODE_ENV=development
```

### 5.2 Production режим

```bash
# Установить webhook
curl https://yourdomain.com/api/telegram/webhook

# Проверить webhook
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

### 5.3 Тестирование Mini App

1. Открыть бота в Telegram
2. Отправить команду `/start`
3. Нажать на кнопку "📱 Открыть Mini App"
4. Или открыть через: `https://t.me/YourBotUsername/appname`

---

## Часть 6: Дополнительные фичи

### 6.1 Inline Mode

Пользователи могут делиться саммари через inline queries:

```typescript
// lib/telegram/handlers/inline.ts
bot.on("inline_query", async (query) => {
  const results = await searchSummaries(query.query);

  await bot.answerInlineQuery(
    query.id,
    results.map((summary) => ({
      type: "article",
      id: summary.id,
      title: summary.title,
      description: summary.content.slice(0, 100),
      input_message_content: {
        message_text: formatSummary(summary),
        parse_mode: "Markdown",
      },
      reply_markup: summaryActionsKeyboard(summary.id),
    }))
  );
});
```

### 6.2 Web App кнопки в сообщениях

```typescript
await bot.sendMessage(chatId, "Посмотри свои саммари:", {
  reply_markup: {
    inline_keyboard: [
      [
        {
          text: "📊 Открыть Dashboard",
          web_app: { url: process.env.MINI_APP_URL! },
        },
      ],
    ],
  },
});
```

### 6.3 Telegram Login Widget (для веб-версии)

```typescript
// app/(auth)/login/page.tsx
export default function LoginPage() {
  return (
    <div>
      {/* Обычная форма логина */}
      <LoginForm />

      {/* Или */}
      <div className="mt-4">
        <TelegramLoginButton
          botName="YourBotUsername"
          onAuth={handleTelegramAuth}
        />
      </div>
    </div>
  );
}
```

---

## Roadmap интеграции

### Фаза 1: Базовый бот (3-4 дня)

- ✅ Настройка бота и webhook
- ✅ Команды /start, /subscribe, /list
- ✅ Интеграция с БД
- ✅ Отправка саммари по команде

### Фаза 2: Mini App MVP (4-5 дней)

- ✅ Настройка Telegram WebApp SDK
- ✅ Аутентификация через initData
- ✅ Базовый UI дашборда
- ✅ Просмотр саммари

### Фаза 3: Расширенные функции (3-4 дня)

- ✅ Управление каналами в Mini App
- ✅ Генерация саммари из Mini App
- ✅ Уведомления через бота
- ✅ Inline mode для шаринга

### Фаза 4: Полировка (2-3 дня)

- ✅ Haptic feedback
- ✅ Адаптация под темную/светлую тему Telegram
- ✅ Оптимизация загрузки
- ✅ Обработка ошибок

---

## Преимущества решения

1. **Единая экосистема** - все в Telegram
2. **Быстрый онбординг** - не нужна регистрация
3. **Push уведомления** - встроенные в Telegram
4. **Мобильность** - работает на всех платформах
5. **Низкий порог входа** - знакомый интерфейс

## Альтернативы и улучшения

- **Telegram Payments** - платные подписки
- **Telegram Stars** - монетизация через звезды
- **Mini App Games** - геймификация (стрики чтения)
- **Channels/Groups бот** - добавление бота в каналы для автопарсинга

---

Готов помочь с реализацией любой части интеграции! 🚀
