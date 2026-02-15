# Plan: React Native мобильное приложение (Android)

> Status: **Draft**
> Created: 2026-02-15
> Priority: Medium

## Context

DevDigest Tracker — веб-приложение на Next.js 16 для агрегации контента из Telegram-каналов и RSS с AI-суммаризацией. Текущая архитектура:

- **Backend**: Next.js 16, PostgreSQL + Prisma ORM, Redis (кэш)
- **Auth**: NextAuth.js v5 (JWT strategy) — Credentials (email/password), Passkey, Telegram WebApp
- **Telegram**: Grammy bot + Mini App (WebApp), webhook на `/api/telegram/webhook`
- **AI**: OpenAI для генерации дневных/недельных саммари
- **API routes**: REST на `/app/api/` — channels CRUD, summaries generate, passkey, cron, health, metrics
- **Server Actions**: `app/actions/` — channels, summaries, preferences (используются SSR-страницами дашборда)

Целевая аудитория — Telegram-пользователи, поэтому основной поток аутентификации в мобильном приложении — через Telegram. Приложение ориентировано на Android (основная платформа Telegram-аудитории в СНГ).

---

## 1. Стек технологий

### 1.1. React Native CLI vs Expo

**Решение: Expo (Managed Workflow с development builds)**

Обоснование:

- Проект не требует нативных модулей, которых нет в Expo SDK
- Expo Router обеспечивает file-based routing, знакомый по Next.js
- EAS Build/Submit упрощает сборку APK/AAB без локальной Android Studio
- OTA-обновления через `expo-updates` — критично для быстрых итераций
- Expo SDK 52+ полностью поддерживает кастомные development builds

```bash
npx create-expo-app@latest devdigest-mobile --template tabs
```

### 1.2. Навигация

**Expo Router v4** (file-based, аналог Next.js App Router)

Структура маршрутов:

```
app/
  _layout.tsx          — Root layout (AuthProvider, ThemeProvider)
  (auth)/
    _layout.tsx        — Auth stack
    login.tsx          — Экран входа через Telegram
  (tabs)/
    _layout.tsx        — Bottom tabs
    index.tsx          — Dashboard (главная)
    channels/
      _layout.tsx      — Stack для каналов
      index.tsx        — Список каналов
      [id].tsx         — Детали канала + посты
    summaries/
      _layout.tsx      — Stack для саммари
      index.tsx        — Список саммари
      [id].tsx         — Детали саммари
    settings.tsx       — Настройки
```

### 1.3. State Management

**TanStack Query (React Query) v5** — для серверного состояния (API запросы, кэширование, offline support)

- Автоматическое кэширование и refetch при возврате на экран
- Offline поддержка с `persistQueryClient` + `AsyncStorage`
- Мутации с optimistic updates для toggle channel, delete и т.п.

**Zustand** — для минимального клиентского состояния (auth token, user preferences, theme)

### 1.4. HTTP клиент

**Axios** с interceptors для JWT:

- Interceptor добавляет `Authorization: Bearer <token>`
- Обрабатывает 401 → redirect на login

### 1.5. UI компоненты

**React Native Paper (Material Design 3)** + кастомные компоненты

- Material Design нативен для Android
- Тёмная/светлая тема из коробки
- Компоненты: Card, FAB, Badge, Chips, Dialog, Snackbar

Дополнительно:

- `react-native-markdown-display` — рендеринг markdown саммари
- `expo-haptics` — тактильная обратная связь
- `react-native-reanimated` — анимации

### 1.6. Полный список зависимостей

```json
{
  "dependencies": {
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "expo-auth-session": "~6.0.0",
    "expo-web-browser": "~14.0.0",
    "expo-secure-store": "~14.0.0",
    "expo-haptics": "~14.0.0",
    "expo-notifications": "~0.29.0",
    "expo-linking": "~7.0.0",
    "expo-splash-screen": "~0.29.0",
    "@tanstack/react-query": "^5.0.0",
    "@tanstack/react-query-persist-client": "^5.0.0",
    "@react-native-async-storage/async-storage": "^2.0.0",
    "react-native-paper": "^5.12.0",
    "react-native-safe-area-context": "^4.12.0",
    "react-native-screens": "~4.0.0",
    "react-native-reanimated": "~3.16.0",
    "react-native-gesture-handler": "~2.20.0",
    "react-native-markdown-display": "^7.0.0",
    "axios": "^1.7.0",
    "zustand": "^5.0.0",
    "date-fns": "^4.1.0",
    "zod": "^3.25.0"
  }
}
```

---

## 2. Структура проекта и монорепо

### 2.1. Расположение в репозитории

```
dev_digest_tracker/
  app/                      <- Next.js web app (без изменений)
  lib/                      <- Серверная логика
  prisma/                   <- Схема БД
  components/               <- Web-компоненты
  mobile/                   <- React Native приложение (NEW)
    app/                    <- Expo Router screens
    src/
      api/                  <- API клиент, endpoints
      components/           <- Shared UI компоненты
      hooks/                <- Custom hooks
      stores/               <- Zustand stores
      types/                <- TypeScript типы
      utils/                <- Утилиты
      theme/                <- Тема (цвета, шрифты)
    assets/                 <- Иконки, шрифты, картинки
    app.json                <- Expo конфигурация
    eas.json                <- EAS Build конфигурация
    package.json
    tsconfig.json
  docs/
  package.json              <- Root (web)
  pnpm-workspace.yaml       <- Workspace config
```

### 2.2. pnpm workspace

Обновить `pnpm-workspace.yaml`:

```yaml
packages:
  - .
  - mobile
```

### 2.3. Shared types

Начать с дублирования типов в `mobile/src/types/`. Мигрировать на shared пакет когда мобильное приложение стабилизируется.

---

## 3. Аутентификация

### 3.1. Проблема

Мобильное приложение не может использовать cookie-based auth (NextAuth JWT в httpOnly cookie). Нужен API-based auth flow с `Authorization: Bearer` header.

### 3.2. Новые endpoints

#### `POST /api/auth/mobile/telegram`

```typescript
// app/api/auth/mobile/telegram/route.ts
// Flow через Telegram Login Widget:
// 1. Expo WebBrowser открывает страницу с Telegram Login Widget
// 2. Пользователь авторизуется
// 3. Widget возвращает initData
// 4. Приложение отправляет initData на этот endpoint
// 5. Backend валидирует через validateTelegramWebAppData()
// 6. Возвращает JWT

// Response: { token, user: { id, name, telegramId }, expiresAt }
```

#### `POST /api/auth/mobile/refresh`

```typescript
// app/api/auth/mobile/refresh/route.ts
// Header: Authorization: Bearer <expiring-token>
// Response: { token, expiresAt }
```

### 3.3. Bearer token middleware

```typescript
// lib/auth/mobile.ts
export async function authFromHeader(request: NextRequest): Promise<Session | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const payload = jwt.verify(token, process.env.NEXTAUTH_SECRET!);
  return { user: { id: payload.sub as string } };
}

// Обновлённый auth helper:
export async function getSession(request?: NextRequest) {
  if (request) {
    const mobileSession = await authFromHeader(request);
    if (mobileSession) return mobileSession;
  }
  return await auth();
}
```

### 3.4. Хранение токена на мобильном

```typescript
// SecureStore использует Android Keystore
await SecureStore.setItemAsync("auth_token", token);
```

### 3.5. Flow через Telegram

```
Mobile App → Telegram Login Widget (WebBrowser) → initData → POST /api/auth/mobile/telegram → JWT
```

Альтернативный flow через бота:

```
Mobile App → Deep link в бота → /start mobile_auth_{nonce} → Бот генерирует auth_code →
Deep link обратно devdigest://auth/callback?code=... → POST /api/auth/mobile/telegram → JWT
```

---

## 4. Экраны приложения

### 4.1. Login Screen

- Логотип DevDigest
- Кнопка "Войти через Telegram" (основная)
- Опционально: кнопка "Войти по email"

### 4.2. Dashboard (Главная)

Аналог `app/(dashboard)/dashboard/page.tsx`:

- Карточка "Сводка за сегодня"
- Горизонтальный скролл популярных тем (chips)
- Лента "Последние посты" (FlatList + pull-to-refresh)
- FAB "Генерировать саммари"

### 4.3. Channels List

- SearchBar + фильтры (Chips: Все / Telegram / RSS)
- FlatList каналов (ChannelCard)
- Swipe actions: удалить, приостановить
- FAB "Добавить канал" → Bottom Sheet с URL-полем

### 4.4. Channel Detail

- Header с информацией о канале
- FlatList постов с пагинацией (infinite scroll)
- Pull-to-refresh → `POST /api/channels/[id]/refresh`

### 4.5. Summaries List

- Фильтры: период, тема (чипы)
- FlatList с SummaryCard
- Infinite scroll
- FAB "Создать саммари"

### 4.6. Summary Detail

- Заголовок, дата, период, чипы тем
- Markdown контент (`react-native-markdown-display`)
- Список связанных постов
- Кнопки: перегенерировать, поделиться, удалить

### 4.7. Settings

- Секция "Профиль" — имя, email, Telegram аккаунт
- Секция "Предпочтения" — темы, интервал саммари, язык
- Секция "Уведомления"
- Секция "О приложении" — версия, выход

---

## 5. Необходимые изменения в Backend API

### 5.1. Новые REST endpoints

| Endpoint                         | Метод  | Назначение              | Статус  |
| -------------------------------- | ------ | ----------------------- | ------- |
| `/api/auth/mobile/telegram`      | POST   | Telegram auth → JWT     | **NEW** |
| `/api/auth/mobile/refresh`       | POST   | Обновление JWT          | **NEW** |
| `/api/summaries`                 | GET    | Список саммари          | **NEW** |
| `/api/summaries/[id]`            | GET    | Детали саммари          | **NEW** |
| `/api/summaries/[id]`            | DELETE | Удалить саммари         | **NEW** |
| `/api/summaries/[id]/regenerate` | POST   | Перегенерация           | **NEW** |
| `/api/preferences`               | GET    | Получить настройки      | **NEW** |
| `/api/preferences`               | PATCH  | Обновить настройки      | **NEW** |
| `/api/profile`                   | GET    | Профиль пользователя    | **NEW** |
| `/api/dashboard/stats`           | GET    | Статистика для дашборда | **NEW** |

### 5.2. Обновление существующих endpoints

Все существующие API routes используют `auth()` (cookie-based). Обновить для поддержки Bearer token через `getSession(request)`.

**Затрагиваемые файлы:**

- `app/api/channels/route.ts`
- `app/api/channels/[id]/route.ts`
- `app/api/channels/[id]/posts/route.ts`
- `app/api/channels/[id]/refresh/route.ts`
- `app/api/channels/refresh/route.ts`
- `app/api/channels/validate/route.ts`
- `app/api/summaries/generate/route.ts`

---

## 6. API интеграция (Mobile)

### 6.1. API Client

```typescript
// mobile/src/api/client.ts
const API_BASE_URL = __DEV__
  ? "http://10.0.2.2:3000/api" // Android emulator → localhost
  : "https://your-domain.com/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// Interceptors для JWT и 401 обработки
```

### 6.2. TanStack Query hooks

```typescript
// useChannels(), useChannel(id), useChannelPosts(id)
// useSummaries(), useSummary(id), useDashboardStats()
// useAddChannel(), useDeleteChannel(), useToggleChannel()
```

### 6.3. Offline support

`persistQueryClient` + `AsyncStorage` — кэшированные данные при потере сети.

---

## 7. Push-уведомления

### 7.1. Фаза 1: Telegram Bot (уже работает)

Уведомления через `bot.notifyNewSummary()`. Обновить кнопки с deep links:

```typescript
keyboard.url("Открыть в приложении", `devdigest://summaries/${id}`);
```

### 7.2. Фаза 2: Firebase Cloud Messaging (опционально)

- `expo-notifications` для нативных push
- Новая модель `PushToken` в Prisma
- Endpoint `POST /api/notifications/register`

---

## 8. Тема и дизайн

Использовать цвета из текущего web-приложения (`app/globals.css`):

```typescript
export const lightTheme = {
  primary: "#171717",
  background: "#ffffff",
  card: "#f5f5f5",
  text: "#0a0a0a",
  textSecondary: "#737373",
  border: "#e5e5e5",
  destructive: "#ef4444",
};

export const darkTheme = {
  primary: "#fafafa",
  background: "#0a0a0a",
  card: "#171717",
  text: "#fafafa",
  textSecondary: "#a3a3a3",
  border: "#262626",
  destructive: "#dc2626",
};
```

---

## 9. Сборка и деплой

### 9.1. EAS Build

```json
// mobile/eas.json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

### 9.2. Команды сборки

```bash
# APK для тестирования
eas build --platform android --profile preview

# AAB для Google Play
eas build --platform android --profile production

# OTA обновление
eas update --branch production --message "fix: описание"
```

### 9.3. Распространение

1. Прямая ссылка на APK через Telegram бота
2. Google Play Internal Testing
3. Google Play Production

---

## 10. Фазы реализации

### Фаза 1: Инфраструктура и Auth

> Цель: приложение запускается, пользователь может войти через Telegram

- [ ] Создать Expo проект в `mobile/`
- [ ] Настроить pnpm workspace
- [ ] Настроить Expo Router, React Native Paper, TanStack Query
- [ ] Создать API клиент с interceptors
- [ ] **Backend**: `POST /api/auth/mobile/telegram`
- [ ] **Backend**: `POST /api/auth/mobile/refresh`
- [ ] **Backend**: `lib/auth/mobile.ts` (Bearer token validation)
- [ ] **Backend**: обновить `getSession()` для Bearer token
- [ ] Auth store (Zustand + SecureStore)
- [ ] Login screen с Telegram auth flow
- [ ] Deep link scheme `devdigest://`

### Фаза 2: Каналы

> Цель: пользователь видит каналы, может добавлять/удалять

- [ ] Экран списка каналов (FlatList)
- [ ] ChannelCard компонент
- [ ] Фильтры и поиск
- [ ] Bottom Sheet для добавления канала
- [ ] Swipe-to-delete и toggle active
- [ ] Экран деталей канала с постами
- [ ] Pull-to-refresh
- [ ] TanStack Query hooks

### Фаза 3: Саммари

> Цель: пользователь видит саммари, может генерировать новые

- [ ] **Backend**: `GET /api/summaries` (список)
- [ ] **Backend**: `GET /api/summaries/[id]` (детали)
- [ ] **Backend**: `DELETE /api/summaries/[id]`
- [ ] **Backend**: `GET /api/dashboard/stats`
- [ ] Экран списка саммари с фильтрами
- [ ] Экран деталей с markdown рендерингом
- [ ] Dashboard экран
- [ ] FAB для генерации саммари

### Фаза 4: Настройки и polish

> Цель: полнофункциональное приложение

- [ ] **Backend**: `GET/PATCH /api/preferences`
- [ ] **Backend**: `GET /api/profile`
- [ ] Экран настроек
- [ ] Тёмная тема
- [ ] Splash screen, error boundaries, offline banner, скелетоны

### Фаза 5: Deep links и уведомления

- [ ] Expo Linking для deep links
- [ ] **Backend**: обновить Telegram кнопки с deep links
- [ ] Обработка `devdigest://summaries/[id]`, `devdigest://channels/[id]`

### Фаза 6: Сборка и распространение

- [ ] Настроить EAS Build
- [ ] Development build → Preview APK → Production AAB
- [ ] App signing, OTA обновления
- [ ] Команда `/download_app` в боте

### Фаза 7: FCM Push Notifications (опционально)

- [ ] Firebase проект + `expo-notifications`
- [ ] **Backend**: модель `PushToken`, endpoint регистрации
- [ ] Интеграция с `notifyNewSummary()`

---

## Сводка файлов

### Новые файлы (Backend)

| Файл                                    | Назначение             |
| --------------------------------------- | ---------------------- |
| `app/api/auth/mobile/telegram/route.ts` | Telegram auth → JWT    |
| `app/api/auth/mobile/refresh/route.ts`  | Обновление JWT         |
| `lib/auth/mobile.ts`                    | Bearer token валидация |
| `app/api/summaries/route.ts`            | GET список саммари     |
| `app/api/summaries/[id]/route.ts`       | GET/DELETE саммари     |
| `app/api/preferences/route.ts`          | GET/PATCH настройки    |
| `app/api/profile/route.ts`              | GET профиль            |
| `app/api/dashboard/stats/route.ts`      | GET статистика         |

### Модифицируемые файлы (Backend)

| Файл                                     | Изменение             |
| ---------------------------------------- | --------------------- |
| `app/api/channels/route.ts`              | Поддержка Bearer auth |
| `app/api/channels/[id]/route.ts`         | Поддержка Bearer auth |
| `app/api/channels/[id]/posts/route.ts`   | Поддержка Bearer auth |
| `app/api/channels/[id]/refresh/route.ts` | Поддержка Bearer auth |
| `app/api/summaries/generate/route.ts`    | Поддержка Bearer auth |
| `lib/telegram/bot.ts`                    | Deep link кнопки      |
| `pnpm-workspace.yaml`                    | Добавить `mobile`     |

### Ключевые файлы (Mobile)

| Файл                                    | Назначение              |
| --------------------------------------- | ----------------------- |
| `mobile/app/_layout.tsx`                | Root layout (providers) |
| `mobile/app/(auth)/login.tsx`           | Экран входа             |
| `mobile/app/(tabs)/_layout.tsx`         | Bottom tabs             |
| `mobile/app/(tabs)/index.tsx`           | Dashboard               |
| `mobile/app/(tabs)/channels/index.tsx`  | Список каналов          |
| `mobile/app/(tabs)/channels/[id].tsx`   | Детали канала           |
| `mobile/app/(tabs)/summaries/index.tsx` | Список саммари          |
| `mobile/app/(tabs)/summaries/[id].tsx`  | Детали саммари          |
| `mobile/app/(tabs)/settings.tsx`        | Настройки               |
| `mobile/src/api/client.ts`              | Axios клиент            |
| `mobile/src/stores/auth.ts`             | Auth store              |
| `mobile/src/theme/colors.ts`            | Цветовая схема          |

---

## Верификация

1. **Auth**: вход через Telegram → JWT → запросы к API → auto-refresh token
2. **Channels**: добавить канал → увидеть в списке → pull-to-refresh → посты загружены
3. **Summaries**: генерировать саммари → увидеть в списке → markdown отрендерен
4. **Settings**: изменить настройки → сохранено → перезапуск → настройки на месте
5. **Deep links**: уведомление в Telegram → кнопка → приложение на нужном экране
6. **Offline**: отключить сеть → данные из кэша → banner "Нет подключения"
7. **Build**: `eas build --platform android --profile preview` → APK работает
