# Plan: n8n Integration for Content Aggregation

> Status: **Draft**
> Created: 2026-02-15
> Priority: Medium

## Context

DevDigest Tracker currently uses custom parsers (Telegram HTML scraping, RSS parser) with cron-triggered API routes for content aggregation. This approach works for 2-3 sources but becomes increasingly expensive to maintain as we add new source types (YouTube, HN, Reddit, GitHub Releases, Dev.to, etc.).

**Key bottleneck**: not parsing speed, but the gap between publication and summary delivery (cron interval 6h + OpenAI generation time).

## Decision

**Hybrid architecture** — n8n handles raw data collection only, everything else stays in Next.js.

```
n8n (data collector)                    Next.js (business logic + UI)
┌──────────────────────────┐            ┌────────────────────────────┐
│                          │            │                            │
│  RSS Feeds ──────────┐   │            │  POST /api/ingest/posts    │
│  YouTube Channels ───┤   │   webhook  │    ├─ validate & dedup     │
│  Hacker News ────────┼───┼───────────▶│    ├─ save to PostgreSQL   │
│  Reddit Subreddits ──┤   │            │    ├─ invalidate Redis     │
│  GitHub Releases ────┤   │            │    └─ trigger AI summary   │
│  Dev.to Articles ────┘   │            │                            │
│                          │            │  Everything else:          │
│  Telegram Channels ──────┼──(TBD)──▶  │    ├─ Auth (Passkey/TG)   │
│                          │            │    ├─ AI Summarization     │
│  Error handling          │            │    ├─ Dashboard UI         │
│  Retry policies          │            │    ├─ User preferences     │
│  Deduplication           │            │    ├─ Telegram Mini App    │
│  Rate limiting           │            │    └─ Notifications        │
│                          │            │                            │
└──────────────────────────┘            └────────────────────────────┘
```

## Phases

### Phase 1: Infrastructure Setup

- [ ] Deploy n8n self-hosted (Docker container alongside existing stack)
- [ ] Add `n8n` service to `docker-compose.prod.yml` and `docker-compose.dev.yml`
- [ ] Configure n8n with PostgreSQL (separate DB or shared instance with separate schema)
- [ ] Set up n8n credentials store (API keys, tokens)
- [ ] Configure network access between n8n and Next.js containers
- [ ] Add `N8N_WEBHOOK_SECRET` env variable for webhook auth

**Docker Compose addition:**

```yaml
n8n:
  image: n8nio/n8n:latest
  restart: unless-stopped
  ports:
    - "5678:5678"
  environment:
    - N8N_BASIC_AUTH_ACTIVE=true
    - N8N_BASIC_AUTH_USER=${N8N_AUTH_USER}
    - N8N_BASIC_AUTH_PASSWORD=${N8N_AUTH_PASSWORD}
    - DB_TYPE=postgresdb
    - DB_POSTGRESDB_HOST=postgres
    - DB_POSTGRESDB_DATABASE=n8n
    - DB_POSTGRESDB_USER=${POSTGRES_USER}
    - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD}
    - WEBHOOK_URL=${N8N_WEBHOOK_URL}
  volumes:
    - n8n_data:/home/node/.n8n
  networks:
    - devdigest_network
  depends_on:
    postgres:
      condition: service_healthy
```

### Phase 2: Ingest API Endpoint

Create a unified webhook endpoint in Next.js that n8n workflows will call.

- [ ] Create `POST /api/ingest/posts` endpoint
- [ ] Accept batch of posts in normalized format
- [ ] Validate webhook secret (`N8N_WEBHOOK_SECRET` header)
- [ ] Deduplicate by `externalId + sourceType`
- [ ] Auto-create channels if not exists (or link to user's channels)
- [ ] Invalidate relevant Redis caches
- [ ] Return count of new posts added

**Payload schema:**

```typescript
interface IngestPayload {
  source: "rss" | "telegram" | "youtube" | "hackernews" | "reddit" | "github" | "devto";
  channelUrl: string;
  channelName: string;
  posts: Array<{
    externalId: string;
    title: string;
    content: string;
    url: string;
    author?: string;
    publishedAt: string; // ISO 8601
    metadata?: Record<string, unknown>; // source-specific data
  }>;
}
```

### Phase 3: RSS Migration to n8n

Migrate existing RSS aggregation from custom parser to n8n workflow.

- [ ] Create n8n workflow: "RSS Aggregator"
  - Trigger: Schedule (every 2h instead of 6h)
  - Nodes: RSS Feed Read -> Transform -> HTTP Request (webhook to Next.js)
- [ ] Support multiple RSS feeds in a single workflow (using Split In Batches)
- [ ] Add error handling: retry 3x with exponential backoff
- [ ] Set up execution logging
- [ ] Test side-by-side with existing parser, verify parity
- [ ] Remove cron logic from `/api/cron/fetch-posts` for RSS sources
- [ ] Keep `lib/parsers/rss-parser.ts` as fallback / manual refresh

### Phase 4: New Source — Hacker News

First new source that wouldn't exist without n8n.

- [ ] Create n8n workflow: "HN Top Stories"
  - Trigger: Schedule (every 3h)
  - Nodes: HTTP Request (HN API) -> Filter (score > 50) -> Transform -> Webhook
- [ ] HN API: `https://hacker-news.firebaseio.com/v0/topstories.json`
- [ ] Fetch top 30 stories, filter by score and keywords (match user topics)
- [ ] Add `hackernews` to `sourceType` enum in Prisma schema
- [ ] Update UI channel list to display HN source type

### Phase 5: New Source — GitHub Releases

- [ ] Create n8n workflow: "GitHub Release Tracker"
  - Trigger: Schedule (every 6h)
  - Nodes: GitHub node (List Releases) -> Filter (new since last check) -> Transform -> Webhook
- [ ] Track popular repos: React, Next.js, TypeScript, Node.js, Bun, etc.
- [ ] Allow users to add custom repos to track
- [ ] Add `github` to `sourceType` enum in Prisma schema

### Phase 6: New Source — YouTube Channels

- [ ] Create n8n workflow: "YouTube Tech Channels"
  - Trigger: Schedule (every 6h)
  - Nodes: YouTube node (Search/Playlist Items) -> Filter -> Transform -> Webhook
- [ ] Track channels like Fireship, Theo, ThePrimeagen, etc.
- [ ] Extract video title, description, duration, thumbnail
- [ ] Add `youtube` to `sourceType` enum

### Phase 7: Near-Realtime Summaries

With n8n feeding data more frequently, reduce summary latency.

- [ ] Change n8n schedules to run every 1-2h for high-priority sources
- [ ] Add event-driven summary generation: trigger when N new posts arrive (threshold: 10+)
- [ ] Implement incremental summaries (append to today's summary instead of regenerating)
- [ ] Add webhook from n8n -> Next.js `/api/ingest/trigger-summary` for immediate generation
- [ ] Consider streaming summary updates via SSE to dashboard

## Telegram Channel Parsing — Special Case

n8n does NOT have a native Telegram channel scraping node. Options:

1. **Keep current approach** — `lib/parsers/telegram-parser.ts` stays in Next.js, triggered by its own cron or manual refresh
2. **Move scraping to n8n** — HTTP Request node to `t.me/s/channel` + HTML Extract node (same fragility, just visual)
3. **Switch to Telegram Bot API** — use Grammy bot to subscribe to channel updates via `forwardMessage` or channel admin rights (most reliable, requires bot to be admin)

**Recommendation:** Option 3 long-term, Option 1 short-term (no change needed).

## Database Schema Changes

```prisma
// Update sourceType enum
enum SourceType {
  telegram
  rss
  youtube      // new
  hackernews   // new
  reddit       // new
  github       // new
  devto        // new
}

// Add metadata field to Post
model Post {
  // ... existing fields
  metadata  Json?  // source-specific data (video duration, star count, etc.)
}
```

## Environment Variables (new)

```env
# n8n
N8N_AUTH_USER=admin
N8N_AUTH_PASSWORD=<secure-password>
N8N_WEBHOOK_URL=https://your-domain.com/n8n
N8N_WEBHOOK_SECRET=<shared-secret-for-ingest-api>

# YouTube (for n8n)
YOUTUBE_API_KEY=<key>

# GitHub (for n8n, optional — can use public API)
GITHUB_TOKEN=<pat>
```

## Risks & Mitigations

| Risk                            | Impact                 | Mitigation                                                        |
| ------------------------------- | ---------------------- | ----------------------------------------------------------------- |
| n8n goes down                   | No new posts collected | Health check + alert; keep manual refresh in Next.js as fallback  |
| Webhook delivery fails          | Posts lost             | n8n built-in retry; add dead-letter queue in n8n                  |
| n8n DB corruption               | Workflow configs lost  | Export workflows as JSON to git (backup cron)                     |
| Rate limiting by sources        | Gaps in content        | Per-source rate limit config in n8n; stagger schedules            |
| Added infrastructure complexity | Higher ops burden      | n8n is a single Docker container; monitoring via existing metrics |

## Cost Estimate

| Component                   | Cost                                     |
| --------------------------- | ---------------------------------------- |
| n8n self-hosted             | Free (Docker container, ~256MB RAM)      |
| YouTube API                 | Free tier: 10,000 units/day (sufficient) |
| GitHub API                  | Free: 5,000 req/hour with token          |
| HN API                      | Free, no auth required                   |
| Additional server resources | ~$5/month extra RAM                      |

## Success Metrics

- Time from publication to summary: **< 3 hours** (currently ~6-12h)
- Number of supported source types: **5+** (currently 2)
- New source onboarding time: **< 1 day** (currently 2-3 days for parser + tests)
- Zero increase in Next.js codebase for new sources (all in n8n workflows)

## What NOT to Move to n8n

- AI summarization (needs access to user preferences, topic extraction, custom prompts)
- User authentication and session management
- Dashboard UI and API routes
- Telegram Mini App
- Redis caching logic
- Notification delivery (keep centralized in Next.js)

## Timeline Estimate

| Phase                    | Effort      |
| ------------------------ | ----------- |
| Phase 1: Infrastructure  | 1 day       |
| Phase 2: Ingest API      | 1 day       |
| Phase 3: RSS Migration   | 1 day       |
| Phase 4: Hacker News     | 0.5 day     |
| Phase 5: GitHub Releases | 0.5 day     |
| Phase 6: YouTube         | 1 day       |
| Phase 7: Near-Realtime   | 2 days      |
| **Total**                | **~7 days** |
