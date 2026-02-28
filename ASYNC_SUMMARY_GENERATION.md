# Async Summary Generation

> **Статус:** ✅ Реализовано (2026-02-28)

## Проблема

Генерация саммари выполняется синхронно внутри HTTP-запроса: клиент отправляет
`POST /summaries/generate`, ждёт пока NestJS обратится к OpenAI, получит ответ,
запишет в БД — и только тогда получает ответ. Всё это может занимать 10–30 секунд.

## Цель

«Отправил и пошёл заниматься своими делами» — запрос возвращается мгновенно,
генерация идёт в фоне, UI обновляется когда готово.

---

## Выбранный подход: BullMQ + polling

Redis уже используется в проекте (JWT refresh, passkey challenges), поэтому
добавление BullMQ не требует новой инфраструктуры.

### Поток данных

```
Клиент                        API                         Worker
  │                             │                             │
  ├─ POST /summaries/generate ─►│                             │
  │                             ├─ enqueue job ──────────────►│
  │◄─ 202 { jobId } ───────────┤                             │
  │                             │                     OpenAI call
  ├─ GET /jobs/:jobId ─────────►│                             │
  │◄─ { status: "active" } ────┤                             │
  │                             │                       DB write
  ├─ GET /jobs/:jobId ─────────►│                             │
  │◄─ { status: "completed",   ┤                             │
  │     summaryId: "xyz" } ─────┤                             │
  │                             │                             │
  ├─ GET /summaries/xyz ───────►│                             │
  │◄─ { summary } ─────────────┤                             │
```

---

## Реализация

### Backend (`apps/api`)

#### 1. Зависимости

```bash
pnpm add @nestjs/bullmq bullmq
```

#### 2. Регистрация модуля

```typescript
// summaries.module.ts
BullModule.registerQueue({ name: 'summaries' })
```

```typescript
// app.module.ts
BullModule.forRoot({ connection: { host, port } })  // из существующего RedisModule
```

#### 3. Изменение контроллера

```typescript
// POST /summaries/generate  →  202 Accepted
async generate(@Body() dto, @CurrentUser() user) {
  const job = await this.summariesQueue.add('generate', {
    userId: user.id,
    type: dto.type ?? 'daily',
    force: dto.force ?? false,
  });
  return { jobId: job.id };
}

// GET /summaries/jobs/:jobId
async getJobStatus(@Param('jobId') jobId: string) {
  const job = await this.summariesQueue.getJob(jobId);
  if (!job) throw new NotFoundException();
  const state = await job.getState();       // waiting | active | completed | failed
  return {
    status: state,
    summaryId: state === 'completed' ? job.returnvalue?.summaryId : undefined,
    error:     state === 'failed'    ? job.failedReason : undefined,
  };
}
```

#### 4. Процессор очереди

```typescript
@Processor('summaries')
export class SummariesProcessor extends WorkerHost {
  constructor(private readonly summarizer: SummarizerService) {
    super();
  }

  async process(job: Job<GenerateJobData>): Promise<{ summaryId: string }> {
    const { userId, type, force } = job.data;
    const summary =
      type === 'weekly'
        ? await this.summarizer.generateWeekly(userId, force)
        : await this.summarizer.generateDaily(userId, force);
    return { summaryId: summary.id };
  }
}
```

`SummarizerService` не меняется — вся бизнес-логика остаётся на месте.

---

## Реализованные файлы

| Файл | Описание |
|------|----------|
| `apps/api/src/summaries/summaries.processor.ts` | BullMQ processor (WorkerHost) |
| `apps/api/src/summaries/summaries.controller.ts` | `generate` → 202 + `jobId`, `GET /jobs/:jobId` |
| `apps/api/src/summaries/summaries.module.ts` | `BullModule.registerQueue` |
| `apps/api/src/app.module.ts` | `BullModule.forRoot` |
| `apps/frontend/src/api/summaries.ts` | `generate()`, `getJobStatus()` |
| `apps/frontend/src/pages/SummariesPage.tsx` | Polling job status, loading states |
| `apps/mobile/src/api/endpoints.ts` | `getJobStatus` |
| `apps/mobile/src/hooks/index.ts` | `useGenerateSummary` с polling |

---

### Frontend (`apps/frontend`)

#### Изменение мутации

```typescript
// useMutation → возвращает jobId, затем запускает polling
const generateMutation = useMutation({
  mutationFn: (params) => summariesApi.generate(params),  // теперь возвращает { jobId }
  onSuccess: ({ jobId }) => {
    startPolling(jobId);
  },
});

function startPolling(jobId: string) {
  const interval = setInterval(async () => {
    const { status, summaryId } = await summariesApi.getJobStatus(jobId);
    if (status === 'completed') {
      clearInterval(interval);
      queryClient.invalidateQueries({ queryKey: ['summaries'] });
      toast.success('Саммари готово');
    }
    if (status === 'failed') {
      clearInterval(interval);
      toast.error('Ошибка генерации');
    }
  }, 2000);
}
```

#### UI-состояния

| Состояние       | Отображение                                |
|-----------------|--------------------------------------------|
| `queued`        | Спиннер + «Генерируем саммари...»          |
| `active`        | Спиннер + «Анализируем посты...»           |
| `completed`     | Toast «Саммари готово», список обновляется |
| `failed`        | Toast с ошибкой, кнопка «Попробовать снова»|

---

### Mobile (`apps/mobile`)

Та же логика через хук:

```typescript
export function useGenerateSummary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: summariesApi.generate,
    onSuccess: ({ jobId }) => pollJobStatus(jobId, queryClient),
  });
}

async function pollJobStatus(jobId: string, queryClient: QueryClient) {
  const poll = async () => {
    const { status, summaryId } = await summariesApi.getJobStatus(jobId);
    if (status === 'completed') {
      queryClient.invalidateQueries({ queryKey: ['summaries'] });
      return;
    }
    if (status !== 'failed') setTimeout(poll, 2000);
  };
  poll();
}
```

---

## Бонус: мониторинг очереди

```bash
pnpm add @bull-board/nestjs @bull-board/api @bull-board/ui
```

Даёт UI на `/admin/queues` — видно pending/active/failed jobs, можно вручную
перезапустить упавшие задачи.

---

## Что не меняется

- `SummarizerService` — логика генерации без изменений
- Эндпоинт `POST /summaries/:id/regenerate` можно оставить синхронным (regenerate
  работает на уже существующих постах, обычно быстрее) — или тоже перевести в
  очередь по аналогии
- Cron-заглушки (`/cron/daily-summary`) — их реализацию теперь проще сделать через
  ту же очередь

