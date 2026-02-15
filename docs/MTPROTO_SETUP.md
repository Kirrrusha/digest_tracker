# MTProto (GramJS): Настройка и запуск

Руководство по подключению приватных Telegram-каналов через MTProto API.

---

## Как это работает

Пользователь авторизуется в Telegram через номер телефона — приложение получает доступ ко всем его каналам (включая приватные), как обычный Telegram-клиент. Сессия хранится зашифрованной в БД. Посты фетчатся cron-задачей.

```
Пользователь → ввод телефона → код из Telegram → (опционально 2FA пароль)
       ↓
Сессия шифруется (AES-256-CBC) → сохраняется в MTProtoSession
       ↓
Cron раз в N часов → GramJS getMessages → посты в БД → AI-саммари
```

---

## 1. Получение API credentials

1. Открыть [my.telegram.org/apps](https://my.telegram.org/apps)
2. Войти через номер телефона
3. Создать приложение (название и платформа — произвольные)
4. Скопировать **App api_id** и **App api_hash**

---

## 2. ENV переменные

Добавить в `.env.local`:

```env
# MTProto (GramJS)
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=abcdef1234567890abcdef1234567890

# Ключ шифрования сессий — 32 байта в hex (64 символа)
MTPROTO_ENCRYPTION_KEY=<вывод команды ниже>
```

Генерация ключа шифрования:

```bash
openssl rand -hex 32
```

> **Важно:** Если изменить `MTPROTO_ENCRYPTION_KEY` после того как пользователи уже подключились — все существующие сессии станут нечитаемыми. Пользователям придётся переподключиться.

---

## 3. Миграция БД

Модель `MTProtoSession` и поля в `Channel` уже добавлены в схему. Если миграция ещё не применялась:

```bash
pnpm prisma migrate deploy
```

Для разработки:

```bash
pnpm prisma migrate dev --name add-mtproto-and-bot-channels
```

---

## 4. API endpoints

Все маршруты защищены авторизацией NextAuth.

### Авторизация пользователя

**Шаг 1 — Отправить код:**

```http
POST /api/mtproto/auth/send-code
Content-Type: application/json

{ "phoneNumber": "+79001234567" }
```

Ответ:

```json
{
  "phoneCodeHash": "abc123...",
  "sessionString": "1AZWapgB..."
}
```

**Шаг 2 — Верифицировать код:**

```http
POST /api/mtproto/auth/verify
Content-Type: application/json

{
  "sessionString": "1AZWapgB...",
  "phoneNumber": "+79001234567",
  "phoneCode": "12345",
  "phoneCodeHash": "abc123..."
}
```

Если включена 2FA, вернёт:

```json
{ "error": "Требуется пароль двухфакторной аутентификации", "needs2FA": true }
```

Повторить запрос с полем `"password"`:

```json
{
  "sessionString": "...",
  "phoneNumber": "+79001234567",
  "phoneCode": "12345",
  "phoneCodeHash": "abc123...",
  "password": "my2FApassword"
}
```

**Отключить сессию:**

```http
POST /api/mtproto/auth/disconnect
```

### Получить список каналов

```http
GET /api/mtproto/channels
```

Ответ:

```json
[
  {
    "id": "-1001234567890",
    "title": "Приватный канал",
    "username": null,
    "participantsCount": 1500,
    "accessHash": "9876543210...",
    "isAlreadyTracked": false
  }
]
```

---

## 5. Server Actions (для UI)

```ts
import {
  addMTProtoChannel,
  addMultipleMTProtoChannels,
  listMyTelegramChannels,
} from "@/app/actions/mtproto";

// Добавить один канал
const result = await addMTProtoChannel({
  telegramId: "-1001234567890",
  title: "Мой канал",
  username: null,
  accessHash: "9876543210...",
});

// Пакетное добавление
const result = await addMultipleMTProtoChannels([
  { telegramId: "...", title: "Канал 1", username: "chan1", accessHash: "..." },
  { telegramId: "...", title: "Канал 2", username: null, accessHash: "..." },
]);
// result.data = { added: 2, errors: [] }

// Список каналов пользователя
const result = await listMyTelegramChannels();
// result.data = MTProtoChannelInfo[]
```

---

## 6. Формат URL каналов

MTProto каналы хранятся с URL вида:

```
mtproto://{userId}/{telegramChannelId}
```

Пример: `mtproto://cm9abc123/1001234567890`

`userId` — ID пользователя в нашей БД (нужен для поиска MTProto сессии).

---

## 7. Как фетчатся посты (cron)

Cron вызывает `fetchAllUserChannels(userId)`, который обрабатывает все активные каналы кроме `telegram_bot` (они push-based). Каналы `telegram_mtproto` включены.

Для каждого MTProto канала вызывается `TelegramMTProtoParser.fetchPosts()`:

1. Извлекает `userId` и `channelId` из URL
2. Загружает сессию из `MTProtoSession`
3. Расшифровывает сессию
4. Подключается через GramJS
5. Вызывает `client.getMessages(entity, { limit, offsetDate })`
6. Маппит сообщения в `ParsedPost[]`
7. Обновляет `lastUsedAt` сессии

---

## 8. Ошибки и восстановление

| Ситуация                        | Поведение                                                                |
| ------------------------------- | ------------------------------------------------------------------------ |
| Сессия истекла (`AuthKeyError`) | Устанавливает `isActive: false`, выбрасывает `ParseError(ACCESS_DENIED)` |
| Flood wait                      | Выбрасывает `ParseError(RATE_LIMITED)` с количеством секунд              |
| Сессия не найдена               | Выбрасывает `ParseError(ACCESS_DENIED)`                                  |
| Неверный код                    | Ошибка с сообщением "Неверный код подтверждения"                         |
| Неверный пароль 2FA             | Ошибка с сообщением "Неверный пароль двухфакторной аутентификации"       |

Если сессия деактивирована — пользователю нужно переподключить Telegram в настройках (новая авторизация).

---

## 9. Безопасность

- Данные сессии шифруются **AES-256-CBC** с random IV перед записью в БД
- Номера телефонов шифруются тем же образом
- Ключ шифрования хранится только в ENV, не в коде
- При потере ключа все сессии становятся нечитаемыми (требуют переавторизации)
- Сессия деактивируется автоматически при `AuthKeyError`

---

## 10. Проверка работоспособности

```bash
# 1. Убедиться что env переменные выставлены
echo $TELEGRAM_API_ID
echo $TELEGRAM_API_HASH
echo ${#MTPROTO_ENCRYPTION_KEY}  # должно быть 64

# 2. Проверить что миграция применена
pnpm prisma studio  # открыть вкладку MTProtoSession

# 3. Тест шифрования (node REPL)
source .env.local
node -e "
const crypto = require('crypto');
const key = Buffer.from(process.env.MTPROTO_ENCRYPTION_KEY, 'hex');
const iv = crypto.randomBytes(16);
const c = crypto.createCipheriv('aes-256-cbc', key, iv);
const enc = Buffer.concat([c.update('test', 'utf8'), c.final()]);
const d = crypto.createDecipheriv('aes-256-cbc', key, iv);
const dec = Buffer.concat([d.update(enc), d.final()]).toString('utf8');
console.log('OK:', dec === 'test');
"
```
