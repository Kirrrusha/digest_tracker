# Разбивка по коммитам

Выполняй команды по порядку в корне репо. Если что-то уже закоммичено — пропускай этот блок.

---

## 1. DB: группы, channel summary, topics, markTelegramAsRead

```bash
git add apps/api/prisma/schema.prisma \
  "apps/api/prisma/migrations/20260228174617_add_groups_and_channel_summary/migration.sql"
git commit -m "feat(db): add groups, channel summary, topics and markTelegramAsRead

- Channel: isGroup, groupType (group|supergroup|forum)
- Summary: channelId for per-channel summaries, Topic relation
- UserPreferences: markTelegramAsRead
- Migration: topics table and SummaryToTopic"
```

---

## 2. Shared: типы канала и саммари

```bash
git add packages/shared/src/types/channel.ts packages/shared/src/types/summary.ts
git commit -m "feat(shared): add group types and channelId/sources to summary

- channel: isGroup, groupType (GroupType)
- summary: channelId, sources (PostSource[])"
```

---

## 3. API: MTProto — группы, папки, QR и 2FA

```bash
git add \
  apps/api/src/mtproto/dto/bulk-add-groups.dto.ts \
  apps/api/src/mtproto/dto/qr-poll.dto.ts \
  apps/api/src/mtproto/dto/qr-verify-2fa.dto.ts \
  apps/api/src/mtproto/dto/resend-code.dto.ts \
  apps/api/src/mtproto/mtproto-crypto.ts \
  apps/api/src/mtproto/mtproto.controller.ts \
  apps/api/src/mtproto/mtproto.service.ts
git commit -m "feat(api): MTProto groups, folders, QR login and 2FA

- DTOs: bulk-add-groups, qr-poll, qr-verify-2fa, resend-code
- Groups and folders browser support
- QR code auth and 2FA verification"
```

---

## 4. API: channels, summaries, cron

```bash
git add \
  apps/api/src/channels/channels.service.ts \
  apps/api/src/cron/cron.service.ts \
  apps/api/src/posts/posts.controller.ts \
  apps/api/src/summaries/summaries.controller.ts \
  apps/api/src/summaries/summaries.processor.ts \
  apps/api/src/summaries/summaries.service.ts \
  apps/api/src/summaries/summarizer.service.ts
git commit -m "feat(api): channels/summaries/cron for groups and per-channel summary

- Channels service: group support
- Summaries: per-channel summary, processor and summarizer
- Cron: channel summary jobs"
```

---

## 5. Frontend: группы/папки и саммари

```bash
git add \
  apps/frontend/package.json \
  apps/frontend/src/api/mtproto.ts \
  apps/frontend/src/api/summaries.ts \
  apps/frontend/src/components/TelegramChannelBrowser.tsx \
  apps/frontend/src/components/TelegramConnect.tsx \
  apps/frontend/src/components/TelegramFolderBrowser.tsx \
  apps/frontend/src/components/TelegramGroupBrowser.tsx \
  apps/frontend/src/pages/ChannelDetailPage.tsx \
  apps/frontend/src/pages/ChannelsPage.tsx \
  apps/frontend/src/pages/SummariesPage.tsx
git commit -m "feat(frontend): Telegram groups/folders browser and channel summary UI

- TelegramFolderBrowser, TelegramGroupBrowser
- Channels/Summaries pages and API for groups and per-channel summary"
```

---

## 6. Mobile: группы/папки и саммари

```bash
git add \
  'apps/mobile/app/(tabs)/channels/[id].tsx' \
  'apps/mobile/app/(tabs)/channels/index.tsx' \
  'apps/mobile/app/(tabs)/summaries/index.tsx' \
  apps/mobile/components/TelegramConnect.tsx \
  apps/mobile/components/TelegramFolderBrowser.tsx \
  apps/mobile/components/TelegramGroupBrowser.tsx \
  apps/mobile/src/api/endpoints.ts \
  apps/mobile/src/hooks/index.ts
git commit -m "feat(mobile): Telegram groups/folders and summaries

- TelegramFolderBrowser, TelegramGroupBrowser
- Channels and summaries tabs for groups and per-channel"
```

---

## 7. Lockfile

```bash
git add pnpm-lock.yaml
git commit -m "chore: pnpm lockfile"
```

---

После выполнения всех блоков: `git log --oneline -7` — должны быть 7 новых коммитов.
