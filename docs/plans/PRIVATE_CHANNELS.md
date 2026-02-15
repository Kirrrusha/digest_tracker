# Plan: Парсинг приватных каналов — Bot + MTProto

> Status: **Draft**
> Created: 2026-02-15
> Priority: High

## Context

Текущий Telegram-парсер (`lib/parsers/telegram-parser.ts`) работает только с **публичными** каналами через веб-скрейпинг `t.me/s/channel`. Приватные каналы и каналы с ограниченным доступом недоступны.

Добавляем два метода доступа к любым каналам пользователя:

1. **Через бота** — пересылка сообщения из канала + добавление бота как участника
2. **Через MTProto (GramJS)** — авторизация по номеру телефона, доступ ко всем подпискам

---

## Фаза 1: Схема БД

> Статус: `[ ]` TODO

### 1.1. Расширить Channel

**Файл:** `prisma/schema.prisma`

Добавить поля:

```prisma
model Channel {
  # существующие поля...
  sourceType  String   // telegram, rss → добавляем: telegram_bot, telegram_mtproto
  accessHash  String?  // MTProto access hash (зашифрован)
  botAccess   Boolean  @default(false) // бот добавлен как участник канала
}
```

### 1.2. Новая модель MTProtoSession

**Файл:** `prisma/schema.prisma`

```prisma
model MTProtoSession {
  id          String   @id @default(cuid())
  userId      String   @unique
  sessionData String   @db.Text  // Зашифрованная GramJS StringSession
  phoneNumber String?            // Зашифрованный номер телефона
  isActive    Boolean  @default(true)
  lastUsedAt  DateTime @default(now())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("mtproto_sessions")
}
```

### 1.3. Обновить User

**Файл:** `prisma/schema.prisma`

Добавить relation:

```prisma
mtprotoSession MTProtoSession?
```

### 1.4. Расширить SourceType

**Файл:** `lib/parsers/types.ts`

```ts
export type SourceType = "telegram" | "rss" | "telegram_bot" | "telegram_mtproto";
```

### 1.5. Миграция

```bash
pnpm prisma migrate dev --name add-mtproto-and-bot-channels
```

### 1.6. ENV переменные (для MTProto)

```env
TELEGRAM_API_ID=...           # https://my.telegram.org
TELEGRAM_API_HASH=...         # https://my.telegram.org
MTPROTO_ENCRYPTION_KEY=...    # openssl rand -hex 32
```

---

## Фаза 2: Метод 1 — Через бота

> Статус: `[ ]` TODO

### 2.1. Обработчик пересланных сообщений

**Новый файл:** `lib/telegram/handlers/forwards.ts`

Функциональность:

- Ловим `message:forward_origin:channel` (grammy filter)
- Из `forward_origin.chat` извлекаем: `id`, `title`, `username`
- Находим пользователя по `ctx.from.id` → `TelegramAccount`
- Проверяем дубликаты по `telegramId`
- Показываем inline-кнопки "Подписаться" / "Отмена" с callback data `sub_fwd_{chatId}_{title}` / `cancel_fwd`
- При подтверждении — создаём Channel с `sourceType: "telegram_bot"`

### 2.2. Обработчик постов из каналов (real-time)

**Новый файл:** `lib/telegram/handlers/channel-posts.ts`

Функциональность:

- `bot.on("channel_post")` — когда бот является участником канала
- Находим все Channel записи с `telegramId` = `chatId` и `sourceType: "telegram_bot"`
- Извлекаем: `text || caption`, `message_id`, `date`, `author_signature`
- Сохраняем через `db.post.upsert` (по `channelId_externalId`)
- `bot.on("my_chat_member")` — отслеживание добавления/удаления бота
  - `chat.type === "channel"` → обновляем `botAccess: true/false`
  - Логируем изменение статуса

### 2.3. Callback handlers

**Файл (модифицировать):** `lib/telegram/handlers/callbacks.ts`

Добавить обработчики:

```ts
bot.callbackQuery(/^sub_fwd_(.+)$/, handleSubscribeForward);
bot.callbackQuery("cancel_fwd", handleCancelForward);
```

`handleSubscribeForward`:

- Парсим chatId из callback data
- Создаём Channel с `sourceType: "telegram_bot"`, `telegramId: chatId`
- sourceUrl: `https://t.me/{username}` или `tg://channel/{chatId}`
- Отвечаем: "Канал добавлен! Для real-time обновлений — добавь бота в канал как участника."

### 2.4. Регистрация в боте

**Файл (модифицировать):** `lib/telegram/bot.ts`

В `initialize()` добавить:

```ts
import { registerChannelPostHandlers } from "./handlers/channel-posts";
import { registerForwardHandlers } from "./handlers/forwards";

registerForwardHandlers(this.bot);
registerChannelPostHandlers(this.bot);
```

**Файл (модифицировать):** `lib/telegram/handlers/index.ts`

Добавить экспорты:

```ts
export { registerForwardHandlers } from "./forwards";
export { registerChannelPostHandlers } from "./channel-posts";
```

### 2.5. TelegramBotParser (заглушка)

**Новый файл:** `lib/parsers/telegram-bot-parser.ts`

Минимальный парсер для совместимости с `ParserFactory`:

- `type: "telegram_bot"`
- `fetchPosts()` → возвращает пустой результат (посты push-based через webhook)
- `isValidSource()` → проверяет `tg://channel/` формат
- `getChannelInfo()` → возвращает данные из БД

**Файл (модифицировать):** `lib/parsers/index.ts`

Зарегистрировать `telegramBotParser` в `ParserFactory`.

### 2.6. Обновить cron фетч

**Файл (модифицировать):** `lib/parsers/index.ts` → `fetchAllUserChannels()`

Пропускать каналы с `sourceType: "telegram_bot"` — они push-based.

---

## Фаза 3: Метод 2 — MTProto (GramJS)

> Статус: `[ ]` TODO

### 3.1. Установка

```bash
pnpm add telegram
```

### 3.2. MTProto клиент

**Новый файл:** `lib/mtproto/client.ts`

Функции:

- `encryptSession(session: string): string` — AES-256-CBC шифрование с random IV
- `decryptSession(data: string): string` — расшифровка
- `createClient(sessionString?): TelegramClient` — создание GramJS клиента
- `createClientFromEncrypted(encryptedData): TelegramClient` — из зашифрованной сессии

Шифрование: `MTPROTO_ENCRYPTION_KEY` (32 bytes hex) → `aes-256-cbc` с `crypto.randomBytes(16)` IV.

### 3.3. MTProto сервис

**Новый файл:** `lib/mtproto/service.ts`

Функции:

```ts
sendAuthCode(phoneNumber: string)
  → { phoneCodeHash: string, sessionString: string }
  // Создаёт клиент, отправляет код, возвращает промежуточную сессию

signIn(sessionString, phoneNumber, phoneCode, phoneCodeHash, password?)
  → { sessionString: string }
  // Завершает авторизацию, обрабатывает 2FA (SESSION_PASSWORD_NEEDED)

saveSession(userId, sessionString, phoneNumber)
  → void
  // Шифрует и сохраняет в MTProtoSession

listUserChannels(userId)
  → MTProtoChannelInfo[]
  // client.getDialogs() → фильтр по isChannel && !isGroup
  // Проверка: какие каналы уже отслеживаются

disconnectSession(userId)
  → void
  // Деактивация сессии в БД
```

Интерфейс:

```ts
interface MTProtoChannelInfo {
  id: string;
  title: string;
  username: string | null;
  participantsCount: number | null;
  accessHash: string;
  isAlreadyTracked: boolean;
}
```

### 3.4. MTProto парсер

**Новый файл:** `lib/parsers/telegram-mtproto-parser.ts`

- `type: "telegram_mtproto"`
- `fetchPosts(sourceUrl, options)`:
  - Из sourceUrl парсим channelId и userId
  - Загружаем сессию из MTProtoSession
  - `client.invoke(messages.GetHistory(...))` для получения постов
  - Маппим в `ParsedPost[]`
- Вызывается cron-задачей как обычный парсер

**Файл (модифицировать):** `lib/parsers/index.ts` — зарегистрировать в фабрике.

### 3.5. API routes

**Новые файлы:**

| Файл                                       | Метод | Назначение                  |
| ------------------------------------------ | ----- | --------------------------- |
| `app/api/mtproto/auth/send-code/route.ts`  | POST  | Отправка кода на телефон    |
| `app/api/mtproto/auth/verify/route.ts`     | POST  | Верификация кода + 2FA      |
| `app/api/mtproto/auth/disconnect/route.ts` | POST  | Отключение сессии           |
| `app/api/mtproto/channels/route.ts`        | GET   | Список каналов пользователя |

Все routes защищены через `auth()`.

### 3.6. Server actions

**Новый файл:** `app/actions/mtproto.ts`

```ts
addMTProtoChannel(channelData: { telegramId, title, username, accessHash })
  → { id, name }
  // Создаёт Channel, запускает фоновый фетч начальных постов

listMyTelegramChannels()
  → MTProtoChannelInfo[]

addMultipleMTProtoChannels(channels[])
  → { added: number, errors: string[] }
```

---

## Фаза 4: UI

> Статус: `[ ]` TODO

### 4.1. Расширить диалог добавления каналов

**Файл (модифицировать):** `components/channels/add-channel-dialog.tsx`

Добавить `Tabs` компонент:

- Таб **"По URL"** — текущий функционал без изменений
- Таб **"Мои каналы Telegram"**:
  - Если MTProto сессия есть → компонент `TelegramChannelBrowser`
  - Если нет → сообщение + ссылка на настройки

### 4.2. Браузер каналов Telegram

**Новый файл:** `components/channels/telegram-channel-browser.tsx`

- Вызывает `listMyTelegramChannels()` server action
- Поле поиска (фильтр по названию)
- Список каналов с чекбоксами
- Бейдж "Уже отслеживается" для существующих каналов
- Кнопка "Добавить выбранные" → `addMultipleMTProtoChannels()`

### 4.3. Настройки: подключение Telegram

**Новый файл:** `components/settings/telegram-connect.tsx`

Шаги:

1. Ввод номера телефона (с маской)
2. Ввод кода из Telegram
3. Опционально: 2FA пароль
4. Статус подключения + кнопка "Отключить"

**Файл (модифицировать):** `app/(dashboard)/dashboard/settings/page.tsx`

Добавить таб "Telegram":

```tsx
<TabsTrigger value="telegram">Telegram</TabsTrigger>
<TabsContent value="telegram">
  <TelegramConnect />
</TabsContent>
```

В `getPreferences()` добавить проверку `MTProtoSession`.

### 4.4. Бейджи типов каналов

**Файл (модифицировать):** `components/channels/add-channel-dialog.tsx` (preview badge)

Маппинг:

- `telegram` → "Telegram"
- `telegram_bot` → "Telegram Bot"
- `telegram_mtproto` → "Telegram Private"
- `rss` → "RSS"

---

## Безопасность

- MTProto сессии шифруются AES-256-CBC перед сохранением в БД
- Ключ шифрования в ENV (`MTPROTO_ENCRYPTION_KEY`), не в коде
- Номера телефонов тоже шифруются
- Rate limiting на auth endpoints (max 3 попытки/час)
- Сессии деактивируются после 30 дней неактивности
- При ошибке `AuthKeyUnregistered` — деактивация сессии + уведомление

---

## Сводка файлов

### Новые файлы

| Файл                                               | Назначение                           |
| -------------------------------------------------- | ------------------------------------ |
| `lib/telegram/handlers/forwards.ts`                | Обработка пересланных сообщений      |
| `lib/telegram/handlers/channel-posts.ts`           | Приём постов из каналов (bot member) |
| `lib/parsers/telegram-bot-parser.ts`               | Парсер для bot-каналов               |
| `lib/parsers/telegram-mtproto-parser.ts`           | Парсер через MTProto                 |
| `lib/mtproto/client.ts`                            | GramJS клиент + шифрование           |
| `lib/mtproto/service.ts`                           | Бизнес-логика MTProto                |
| `app/api/mtproto/auth/send-code/route.ts`          | Отправка кода                        |
| `app/api/mtproto/auth/verify/route.ts`             | Верификация кода                     |
| `app/api/mtproto/auth/disconnect/route.ts`         | Отключение сессии                    |
| `app/api/mtproto/channels/route.ts`                | Список каналов                       |
| `app/actions/mtproto.ts`                           | Server actions                       |
| `components/channels/telegram-channel-browser.tsx` | Браузер каналов                      |
| `components/settings/telegram-connect.tsx`         | UI подключения Telegram              |

### Модифицируемые файлы

| Файл                                          | Изменение                                           |
| --------------------------------------------- | --------------------------------------------------- |
| `prisma/schema.prisma`                        | MTProtoSession, расширение Channel, relation в User |
| `lib/parsers/types.ts`                        | Расширение SourceType                               |
| `lib/parsers/index.ts`                        | Регистрация парсеров, пропуск bot-каналов в cron    |
| `lib/telegram/bot.ts`                         | Регистрация новых handlers                          |
| `lib/telegram/handlers/index.ts`              | Экспорт новых handlers                              |
| `lib/telegram/handlers/callbacks.ts`          | Callback для подтверждения подписки                 |
| `components/channels/add-channel-dialog.tsx`  | Tabs + таб "Мои каналы"                             |
| `app/(dashboard)/dashboard/settings/page.tsx` | Таб "Telegram"                                      |

---

## Верификация

1. **Бот (forward):** переслать боту сообщение из приватного канала → предложение подписки → подтвердить → канал в списке
2. **Бот (channel_post):** добавить бота в канал → новые посты сохраняются в БД автоматически
3. **MTProto (auth):** подключить Telegram в настройках → увидеть статус "Подключено"
4. **MTProto (channels):** открыть "Мои каналы" → увидеть список подписок → выбрать → каналы в списке
5. **Cron:** `telegram_bot` каналы пропускаются, `telegram_mtproto` фетчатся
6. **Саммари:** посты из новых типов каналов попадают в AI-саммари
7. **Type-check:** `pnpm tsc --noEmit`
8. **Build:** `pnpm build`
