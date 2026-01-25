# UI/UX Рекомендации для DevDigest Tracker

## Дизайн-система и компоненты

### 1. Цветовая схема

#### Tailwind конфигурация

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          900: "#0c4a6e",
        },
        accent: {
          500: "#8b5cf6",
          600: "#7c3aed",
        },
        neutral: {
          50: "#fafafa",
          100: "#f5f5f5",
          800: "#262626",
          900: "#171717",
        },
      },
    },
  },
};
```

#### Цветовые темы

**Светлая тема**:

- Фон: `#ffffff` / `neutral-50` для secondary surface
- Текст: `neutral-900` для заголовков, `neutral-600` для вторичного
- Акценты: `primary-500` для кнопок, `accent-500` для highlights
- Карточки: белый с `border-neutral-200`

**Темная тема**:

- Фон: `#0f172a` / `neutral-900` для secondary surface
- Текст: `neutral-50` для заголовков, `neutral-400` для вторичного
- Акценты: `primary-400` для кнопок, `accent-400` для highlights
- Карточки: `neutral-800` с `border-neutral-700`

**Семантические цвета**:

- Успех: `green-500` (#22c55e)
- Ошибка: `red-500` (#ef4444)
- Предупреждение: `yellow-500` (#eab308)
- Информация: `blue-500` (#3b82f6)

---

### 2. Типографика

```css
/* globals.css */
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");

:root {
  --font-heading: "Inter", system-ui, -apple-system, sans-serif;
  --font-body: "Inter", system-ui, -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", "SF Mono", monospace;
}
```

#### Типографическая шкала

```typescript
// Tailwind утилиты
.heading-1 { @apply text-4xl font-bold tracking-tight leading-tight; }
.heading-2 { @apply text-3xl font-semibold tracking-tight; }
.heading-3 { @apply text-2xl font-semibold; }
.heading-4 { @apply text-xl font-semibold; }

.body-large { @apply text-base leading-relaxed; }
.body { @apply text-sm leading-normal; }
.body-small { @apply text-xs leading-normal; }

.caption { @apply text-xs text-neutral-600 dark:text-neutral-400; }
.overline { @apply text-xs uppercase tracking-wide font-semibold; }
```

---

### 3. Spacing System

```typescript
// Используйте консистентную систему отступов
const spacing = {
  xs: '0.5rem',   // 8px  - между тегами
  sm: '0.75rem',  // 12px - внутри карточек
  md: '1rem',     // 16px - между элементами
  lg: '1.5rem',   // 24px - секции
  xl: '2rem',     // 32px - между блоками
  '2xl': '3rem',  // 48px - major sections
}

// Padding для контейнеров
.container-padding { @apply px-4 sm:px-6 lg:px-8; }
```

---

## UI Kit с shadcn/ui

### Установка

```bash
npx shadcn-ui@latest init

# Базовые компоненты
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add input
npx shadcn-ui@latest add select
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add skeleton
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add collapsible
npx shadcn-ui@latest add sheet
```

### Кастомизация стилей

```typescript
// components/ui/card.tsx - расширенная версия
const cardVariants = cva("rounded-lg border transition-all", {
  variants: {
    variant: {
      default: "bg-white border-neutral-200 hover:shadow-md",
      interactive:
        "bg-white border-neutral-200 hover:border-primary-300 hover:shadow-lg cursor-pointer",
      ghost: "border-transparent hover:bg-neutral-50",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});
```

---

## Структура страниц

### Dashboard (Главная страница)

```
┌──────────────────────────────────────────────────────────┐
│ Header                    [🔔 Notifications] [👤 Profile] │
├─────────┬────────────────────────────────────────────────┤
│         │                                                 │
│ Sidebar │  Добрый день, Кирилл! 👋                       │
│         │                                                 │
│ 🏠 Home │  ┌─────────────────────────────────────────┐   │
│ 📺 Каналы│  │ Саммари за сегодня                     │   │
│ 📝 Сам. │  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │   │
│ ⚙️ Наст.│  │                                         │   │
│         │  │ ## React & Frontend                    │   │
│         │  │ React 19 официально релизнулся...      │   │
│         │  │ • Server Components стабильны          │   │
│         │  │ • Actions упрощают формы               │   │
│         │  │ 📎 5 источников                        │   │
│         │  │                                         │   │
│         │  │ ## TypeScript                          │   │
│         │  │ TypeScript 5.4 добавляет NoInfer...   │   │
│         │  │ 📎 3 источника                         │   │
│         │  │                                         │   │
│         │  │ [Читать полностью] [Экспорт в PDF]    │   │
│         │  └─────────────────────────────────────────┘   │
│         │                                                 │
│         │  Статистика                                    │
│         │  ┌─────────┬─────────┬─────────┬─────────┐    │
│         │  │ React   │ Node.js │ TypeScr.│ DevOps  │    │
│         │  │ 12 пост.│ 8 пост. │ 5 пост. │ 3 пост. │    │
│         │  └─────────┴─────────┴─────────┴─────────┘    │
│         │                                                 │
│         │  Последние посты                               │
│         │  ┌───────────────────────────────────────────┐ │
│         │  │ 📺 Frontend Daily                         │ │
│         │  │ React 19 Release Candidate is out        │ │
│         │  │ 5 минут назад • #React #Release          │ │
│         │  └───────────────────────────────────────────┘ │
│         │  ┌───────────────────────────────────────────┐ │
│         │  │ 📰 Node Weekly                            │ │
│         │  │ Performance tips for Node.js 21          │ │
│         │  │ 15 минут назад • #NodeJS #Performance    │ │
│         │  └───────────────────────────────────────────┘ │
└─────────┴─────────────────────────────────────────────────┘
```

#### Код компонента

```typescript
// app/(dashboard)/page.tsx
export default async function DashboardPage() {
  const session = await getServerSession();
  const userId = session.user.id;

  return (
    <div className="container-padding py-8 space-y-8">
      {/* Приветствие */}
      <section>
        <h1 className="heading-1 mb-2">
          Добрый день, {session.user.name}! 👋
        </h1>
        <p className="text-neutral-600">
          Вот что произошло сегодня в мире разработки
        </p>
      </section>

      {/* Саммари за сегодня */}
      <section>
        <Suspense fallback={<SummaryCardSkeleton />}>
          <TodaySummaryCard userId={userId} />
        </Suspense>
      </section>

      {/* Статистика по темам */}
      <section>
        <h2 className="heading-3 mb-4">Статистика</h2>
        <Suspense fallback={<StatsGridSkeleton />}>
          <TopicStatsGrid userId={userId} />
        </Suspense>
      </section>

      {/* Последние посты */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="heading-3">Последние посты</h2>
          <Button variant="ghost" asChild>
            <Link href="/dashboard/posts">Все посты →</Link>
          </Button>
        </div>
        <Suspense fallback={<PostsListSkeleton />}>
          <RecentPostsList userId={userId} limit={5} />
        </Suspense>
      </section>
    </div>
  );
}
```

---

### Страница каналов

```
┌──────────────────────────────────────────────────────────┐
│ Мои каналы                       [+ Добавить канал]      │
│                                                           │
│ [Все] [Telegram] [RSS]           🔍 [Поиск каналов...]   │
│                                                           │
│ ┌────────────────────────────────────────────────────┐   │
│ │ 🔵 Frontend Daily                 [⚙️] [▶️] [🗑️]   │   │
│ │ t.me/frontend_daily                               │   │
│ │                                                    │   │
│ │ #React #TypeScript #CSS #WebDev                   │   │
│ │                                                    │   │
│ │ 📊 45 постов сегодня • 1.2K за неделю             │   │
│ │ Последнее обновление: 5 минут назад               │   │
│ └────────────────────────────────────────────────────┘   │
│                                                           │
│ ┌────────────────────────────────────────────────────┐   │
│ │ 🟢 Node.js News                   [⚙️] [▶️] [🗑️]   │   │
│ │ RSS: nodejs.org/blog/feed                         │   │
│ │                                                    │   │
│ │ #NodeJS #Backend #JavaScript                      │   │
│ │                                                    │   │
│ │ 📊 12 постов сегодня • 84 за неделю               │   │
│ │ Последнее обновление: 1 час назад                 │   │
│ └────────────────────────────────────────────────────┘   │
│                                                           │
│ ┌────────────────────────────────────────────────────┐   │
│ │ ⏸️ DevOps Weekly (пауза)           [⚙️] [▶️] [🗑️]   │   │
│ │ RSS: devopsweekly.com/rss                         │   │
│ │                                                    │   │
│ │ #DevOps #CI/CD #Docker                            │   │
│ │                                                    │   │
│ │ 📊 0 постов сегодня • 42 за неделю                │   │
│ │ На паузе с 20 января                              │   │
│ └────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

#### Компоненты

```typescript
// components/channels/ChannelCard.tsx
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Play, Pause, Trash2, Settings } from 'lucide-react';

export function ChannelCard({ channel }) {
  const isPaused = !channel.isActive;

  return (
    <Card className={cn(
      "group transition-all duration-200",
      isPaused ? "opacity-60" : "hover:border-primary-300 hover:shadow-lg"
    )}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="flex gap-3 flex-1">
          {/* Аватар/иконка */}
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center text-2xl",
            channel.type === 'telegram' ? "bg-blue-100 dark:bg-blue-900" : "bg-green-100 dark:bg-green-900"
          )}>
            {channel.type === 'telegram' ? '📱' : '📰'}
          </div>

          {/* Информация */}
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {channel.name}
              {isPaused && <Badge variant="secondary">Пауза</Badge>}
            </CardTitle>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              {channel.sourceUrl}
            </p>
          </div>
        </div>

        {/* Меню действий */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Settings className="w-4 h-4 mr-2" />
              Настроить
            </DropdownMenuItem>
            <DropdownMenuItem>
              {isPaused ? (
                <><Play className="w-4 h-4 mr-2" />Возобновить</>
              ) : (
                <><Pause className="w-4 h-4 mr-2" />Приостановить</>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">
              <Trash2 className="w-4 h-4 mr-2" />
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent>
        {/* Теги */}
        <div className="flex gap-2 flex-wrap mb-3">
          {channel.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">
              #{tag}
            </Badge>
          ))}
        </div>

        {/* Статистика */}
        <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
          <span className="flex items-center gap-1">
            📊 {channel.todayPostsCount} постов сегодня
          </span>
          <span>•</span>
          <span>{channel.weekPostsCount} за неделю</span>
        </div>

        {/* Последнее обновление */}
        <p className="text-xs text-neutral-500 mt-2">
          {isPaused
            ? `На паузе с ${format(channel.pausedAt, 'dd MMM')}`
            : `Обновлено ${formatDistanceToNow(channel.lastFetchedAt, { locale: ru, addSuffix: true })}`
          }
        </p>
      </CardContent>
    </Card>
  );
}

// components/channels/AddChannelDialog.tsx
export function AddChannelDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Добавить канал
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Добавить новый канал</DialogTitle>
          <DialogDescription>
            Добавьте Telegram канал или RSS фид для отслеживания
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="telegram">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="telegram">Telegram</TabsTrigger>
            <TabsTrigger value="rss">RSS</TabsTrigger>
          </TabsList>

          <TabsContent value="telegram">
            <AddTelegramChannelForm onSuccess={() => setOpen(false)} />
          </TabsContent>

          <TabsContent value="rss">
            <AddRSSChannelForm onSuccess={() => setOpen(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
```

---

### Страница саммари

```
┌──────────────────────────────────────────────────────────┐
│ Саммари                                                   │
│                                                           │
│ ┌─────┬──────┬──────┐  🔍 [Поиск...]   [Экспорт ▼]     │
│ │Сегод│Неделя│Месяц │                                   │
│ └─────┴──────┴──────┘                                    │
│                                                           │
│ Темы: [Все ▼] #React #TypeScript #Next.js [+15]         │
│                                                           │
│ ┌────────────────────────────────────────────────────┐   │
│ │ 25 января 2024                          Вчера 23:00│   │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │   │
│ │                                                     │   │
│ │ ## 🔵 React & Frontend (5 постов)                  │   │
│ │                                                     │   │
│ │ React 19 официально релизнулся с поддержкой        │   │
│ │ Server Components в стабильной версии. Новые       │   │
│ │ фичи включают Actions для упрощения работы с       │   │
│ │ формами, улучшенный Suspense и оптимизации...      │   │
│ │                                                     │   │
│ │ **Ключевые моменты**:                              │   │
│ │ • Server Components в production                   │   │
│ │ • useFormStatus и useFormState hooks               │   │
│ │ • 30% быстрее гидратация                           │   │
│ │                                                     │   │
│ │ [Развернуть источники ▼]                           │   │
│ │                                                     │   │
│ │ ## 🟠 TypeScript (3 поста)                         │   │
│ │                                                     │   │
│ │ TypeScript 5.4 добавляет утилитный тип NoInfer...  │   │
│ │                                                     │   │
│ │ [Поделиться] [Сохранить]                           │   │
│ └────────────────────────────────────────────────────┘   │
│                                                           │
│ ┌────────────────────────────────────────────────────┐   │
│ │ 24 января 2024                                     │   │
│ │ ...                                                │   │
│ └────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

#### Компоненты

```typescript
// components/summaries/SummaryCard.tsx
export function SummaryCard({ summary }) {
  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      {/* Заголовок с датой */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">{summary.title}</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {format(summary.createdAt, 'dd MMMM yyyy, HH:mm', { locale: ru })}
          </p>
        </div>
        <Badge variant="outline">{summary.topics.length} тем</Badge>
      </div>

      <Separator className="mb-6" />

      {/* Контент саммари */}
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <ReactMarkdown
          components={{
            h2: ({ children }) => (
              <h3 className="text-xl font-semibold mb-3 mt-6 first:mt-0">
                {children}
              </h3>
            ),
            ul: ({ children }) => (
              <ul className="space-y-2 my-4">{children}</ul>
            ),
          }}
        >
          {summary.content}
        </ReactMarkdown>
      </div>

      <Separator className="my-6" />

      {/* Источники */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold hover:text-primary-600 transition-colors">
          📎 Источники ({summary.posts.length})
          <ChevronDown className="w-4 h-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 space-y-2">
          {summary.posts.map(post => (
            <PostSourceLink key={post.id} post={post} />
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Действия */}
      <div className="flex gap-2 mt-6">
        <Button variant="outline" size="sm">
          <Share2 className="w-4 h-4 mr-2" />
          Поделиться
        </Button>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Экспорт
        </Button>
        <Button variant="outline" size="sm">
          <Bookmark className="w-4 h-4 mr-2" />
          Сохранить
        </Button>
      </div>
    </Card>
  );
}

// components/summaries/TopicFilter.tsx
export function TopicFilter({ topics, selected, onChange }) {
  return (
    <div className="flex gap-2 flex-wrap items-center">
      <span className="text-sm font-semibold text-neutral-700">Темы:</span>

      <Button
        variant={!selected.length ? "default" : "outline"}
        size="sm"
        onClick={() => onChange([])}
      >
        Все
      </Button>

      {topics.slice(0, 5).map(topic => (
        <Button
          key={topic}
          variant={selected.includes(topic) ? "default" : "outline"}
          size="sm"
          onClick={() => {
            onChange(
              selected.includes(topic)
                ? selected.filter(t => t !== topic)
                : [...selected, topic]
            );
          }}
        >
          #{topic}
        </Button>
      ))}

      {topics.length > 5 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              +{topics.length - 5} еще
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {topics.slice(5).map(topic => (
              <DropdownMenuItem key={topic}>
                #{topic}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
```

---

### Страница настроек

```
┌──────────────────────────────────────────────────────────┐
│ Настройки                                                 │
│                                                           │
│ [Профиль] [Предпочтения] [Уведомления] [API]             │
│                                                           │
│ ┌────────────────────────────────────────────────────┐   │
│ │ Темы и интересы                                    │   │
│ │                                                    │   │
│ │ Выберите темы для персонализации саммари:         │   │
│ │                                                    │   │
│ │ ✅ React          ✅ TypeScript    ✅ Next.js      │   │
│ │ ✅ Node.js        ☐ Python        ☐ Rust          │   │
│ │ ☐ Go             ✅ DevOps        ☐ AI/ML         │   │
│ │ ☐ Databases      ✅ CSS           ☐ Security      │   │
│ │                                                    │   │
│ │ [+ Добавить свою тему]                             │   │
│ └────────────────────────────────────────────────────┘   │
│                                                           │
│ ┌────────────────────────────────────────────────────┐   │
│ │ Частота саммари                                    │   │
│ │                                                    │   │
│ │ ⦿ Ежедневно в 20:00                               │   │
│ │ ○ Еженедельно (воскресенье)                       │   │
│ │ ○ Вручную                                         │   │
│ └────────────────────────────────────────────────────┘   │
│                                                           │
│ ┌────────────────────────────────────────────────────┐   │
│ │ Язык саммари                                       │   │
│ │                                                    │   │
│ │ [Русский ▼]                                        │   │
│ └────────────────────────────────────────────────────┘   │
│                                                           │
│                                     [Отмена] [Сохранить] │
└───────────────────────────────────────────────────────────┘
```

---

## UI States и Patterns

### 1. Loading States

#### Skeleton Loaders

```typescript
// components/skeletons/SummaryCardSkeleton.tsx
export function SummaryCardSkeleton() {
  return (
    <Card className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-16" />
      </div>

      <Separator className="mb-6" />

      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </Card>
  );
}

// Использование с Suspense
<Suspense fallback={<SummaryCardSkeleton />}>
  <TodaySummaryCard />
</Suspense>
```

#### Inline Loading

```typescript
<Button disabled={isLoading}>
  {isLoading ? (
    <>
      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      Генерация...
    </>
  ) : (
    <>
      <Sparkles className="w-4 h-4 mr-2" />
      Создать саммари
    </>
  )}
</Button>
```

#### Progressive Loading

```typescript
// Показываем данные постепенно
export async function DashboardPage() {
  return (
    <>
      {/* Быстрые данные показываем сразу */}
      <QuickStats />

      {/* Медленные данные с fallback */}
      <Suspense fallback={<SummaryCardSkeleton />}>
        <TodaySummary />
      </Suspense>

      <Suspense fallback={<PostsListSkeleton />}>
        <RecentPosts />
      </Suspense>
    </>
  );
}
```

---

### 2. Empty States

```typescript
// components/empty/EmptyChannels.tsx
export function EmptyChannels() {
  return (
    <div className="flex flex-col items-center justify-center h-[500px] text-center">
      <div className="rounded-full bg-neutral-100 dark:bg-neutral-800 p-8 mb-6">
        <Inbox className="w-16 h-16 text-neutral-400 dark:text-neutral-600" />
      </div>

      <h3 className="text-2xl font-semibold mb-2">Нет каналов</h3>
      <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-md">
        Добавьте первый канал из Telegram или RSS, чтобы начать получать
        автоматические саммари по интересующим вас темам
      </p>

      <div className="flex gap-3">
        <Button size="lg">
          <Plus className="w-5 h-5 mr-2" />
          Добавить канал
        </Button>
        <Button variant="outline" size="lg" asChild>
          <Link href="/docs/getting-started">
            📖 Как это работает?
          </Link>
        </Button>
      </div>
    </div>
  );
}

// components/empty/EmptySummaries.tsx
export function EmptySummaries() {
  return (
    <div className="flex flex-col items-center justify-center h-[500px] text-center">
      <div className="rounded-full bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900 dark:to-accent-900 p-8 mb-6">
        <FileText className="w-16 h-16 text-primary-600 dark:text-primary-400" />
      </div>

      <h3 className="text-2xl font-semibold mb-2">Нет саммари</h3>
      <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-md">
        Саммари генерируются автоматически каждый день в 20:00,
        или вы можете создать их вручную прямо сейчас
      </p>

      <Button size="lg">
        <Sparkles className="w-5 h-5 mr-2" />
        Создать саммари сейчас
      </Button>
    </div>
  );
}
```

---

### 3. Error States

```typescript
// components/error/ErrorCard.tsx
export function ErrorCard({ error, retry }) {
  const errorMessages = {
    NETWORK_ERROR: {
      title: 'Проблема с подключением',
      description: 'Не удалось подключиться к серверу',
      icon: WifiOff
    },
    AUTH_ERROR: {
      title: 'Ошибка авторизации',
      description: 'Пожалуйста, войдите заново',
      icon: Lock
    },
    NOT_FOUND: {
      title: 'Не найдено',
      description: 'Запрашиваемый ресурс не существует',
      icon: FileQuestion
    }
  };

  const errorConfig = errorMessages[error.code] || {
    title: 'Ошибка',
    description: error.message,
    icon: AlertCircle
  };

  const Icon = errorConfig.icon;

  return (
    <Card className="p-8">
      <div className="flex flex-col items-center text-center">
        <div className="rounded-full bg-red-100 dark:bg-red-900 p-6 mb-4">
          <Icon className="w-12 h-12 text-red-600 dark:text-red-400" />
        </div>

        <h3 className="text-xl font-semibold mb-2">{errorConfig.title}</h3>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-md">
          {errorConfig.description}
        </p>

        <div className="flex gap-2">
          {retry && (
            <Button onClick={retry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Попробовать снова
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/dashboard">На главную</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

// app/error.tsx - Error Boundary для страниц
'use client';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorCard error={error} retry={reset} />;
}
```

---

### 4. Toast уведомления

```typescript
// Установка
npm install sonner

// app/layout.tsx
import { Toaster } from 'sonner';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}

// Использование в Server Actions
'use server'

import { toast } from 'sonner';

export async function addChannel(formData: FormData) {
  try {
    const channel = await db.channel.create({ /* ... */ });

    // Success toast
    return {
      success: true,
      message: 'Канал успешно добавлен',
      description: 'Посты начнут появляться в течение нескольких минут'
    };
  } catch (error) {
    // Error toast
    return {
      success: false,
      message: 'Не удалось добавить канал',
      description: error.message
    };
  }
}

// В клиентском компоненте
'use client';

const result = await addChannelAction(formData);

if (result.success) {
  toast.success(result.message, {
    description: result.description
  });
} else {
  toast.error(result.message, {
    description: result.description
  });
}
```

---

## Анимации и микроинтеракции

### 1. Framer Motion

```bash
npm install framer-motion
```

```typescript
// components/summaries/SummariesList.tsx
import { motion, AnimatePresence } from 'framer-motion';

export function SummariesList({ summaries }) {
  return (
    <AnimatePresence>
      <div className="space-y-6">
        {summaries.map((summary, index) => (
          <motion.div
            key={summary.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{
              duration: 0.3,
              delay: index * 0.1, // Staggered animation
            }}
          >
            <SummaryCard summary={summary} />
          </motion.div>
        ))}
      </div>
    </AnimatePresence>
  );
}

// Page transitions
export function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}
```

### 2. Tailwind Animations

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        shimmer: 'shimmer 2s infinite linear',
      },
    },
  },
}

// Использование
<div className="animate-fade-in">
  <SummaryCard />
</div>

<Skeleton className="animate-shimmer" />
```

### 3. Hover эффекты

```typescript
// Карточки с интерактивностью
<Card className="
  transition-all duration-200
  hover:shadow-lg hover:-translate-y-1
  hover:border-primary-300
  cursor-pointer
  active:translate-y-0 active:shadow-md
">
  {/* ... */}
</Card>

// Кнопки
<Button className="
  transition-all duration-150
  hover:scale-105
  active:scale-95
">
  Добавить
</Button>

// Tags с hover
<Badge className="
  transition-colors duration-150
  hover:bg-primary-500 hover:text-white
  cursor-pointer
">
  #React
</Badge>
```

---

## Responsive Design

### Breakpoints

```typescript
// Tailwind breakpoints (default)
sm: '640px'   // Мобильные landscape
md: '768px'   // Планшеты
lg: '1024px'  // Десктопы
xl: '1280px'  // Большие экраны
2xl: '1536px' // Extra large
```

### Layout Patterns

#### Dashboard Layout

```typescript
// app/(dashboard)/layout.tsx
export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-neutral-200 dark:border-neutral-800 flex-col">
        <Sidebar />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
            {/* Mobile menu button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="lg:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <Sidebar />
              </SheetContent>
            </Sheet>

            {/* Search */}
            <div className="flex-1 max-w-2xl mx-4">
              <SearchInput />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <NotificationButton />
              <UserMenu />
            </div>
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
```

#### Grid Layouts

```typescript
// Адаптивные сетки
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {items.map(item => <Card key={item.id}>{/* ... */}</Card>)}
</div>

// Masonry layout для саммари
<div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
  {summaries.map(summary => (
    <div key={summary.id} className="break-inside-avoid">
      <SummaryCard summary={summary} />
    </div>
  ))}
</div>
```

---

## Accessibility (a11y)

### Checklist

- ✅ Клавиатурная навигация для всех интерактивных элементов
- ✅ Focus visible (кольцо фокуса)
- ✅ ARIA labels для иконок и кнопок без текста
- ✅ Семантический HTML (header, nav, main, aside, section)
- ✅ Alt текст для изображений
- ✅ Контрастность цветов (WCAG AA minimum 4.5:1)
- ✅ Skip to main content link
- ✅ Screen reader friendly

### Примеры

#### Focus Management

```typescript
// Видимый фокус для всех элементов
button:focus-visible {
  @apply ring-2 ring-primary-500 ring-offset-2;
}

// Skip link
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black"
>
  Перейти к основному контенту
</a>
```

#### ARIA Labels

```typescript
<Button
  aria-label="Добавить новый канал"
  onClick={handleAdd}
>
  <Plus className="w-4 h-4" aria-hidden="true" />
</Button>

<nav aria-label="Основная навигация">
  <ul>
    <li><Link href="/">Главная</Link></li>
    {/* ... */}
  </ul>
</nav>
```

#### Screen Reader Text

```typescript
<span className="sr-only">Загрузка...</span>
<Loader2 className="animate-spin" aria-hidden="true" />
```

---

## Dark Mode

### Реализация

```typescript
// app/providers.tsx
'use client';

import { ThemeProvider } from 'next-themes';

export function Providers({ children }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
}

// components/ThemeToggle.tsx
'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Переключить тему</span>
    </Button>
  );
}
```

### Dark Mode стили

```typescript
// Используйте dark: префикс в Tailwind
<Card className="
  bg-white dark:bg-neutral-900
  border-neutral-200 dark:border-neutral-800
  text-neutral-900 dark:text-neutral-100
">
  {/* ... */}
</Card>

// Избегайте жестко заданных цветов
// ❌ Плохо
<div className="text-black bg-white" />

// ✅ Хорошо
<div className="text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900" />
```

---

## Источники вдохновения для дизайна

### 1. **Vercel Dashboard**

- Минималистичный, чистый дизайн
- Отличные transitions и hover states
- Консистентная цветовая схема
- [vercel.com/dashboard](https://vercel.com/dashboard)

### 2. **Linear**

- Превосходная типографика
- Идеальный spacing
- Приятные анимации
- Темная тема как default
- [linear.app](https://linear.app)

### 3. **Notion**

- Отличные empty states
- Хороший onboarding
- Гибкая структура контента
- [notion.so](https://notion.so)

### 4. **Arc Browser**

- Современные градиенты
- Blur эффекты (glass morphism)
- Цветные акценты
- [arc.net](https://arc.net)

### 5. **Tailwind UI**

- Готовые паттерны и компоненты
- Dashboard templates
- [tailwindui.com](https://tailwindui.com)

---

## Генерация UI с помощью AI

### Промпты для генерации компонентов

#### 1. Генерация базового компонента

```
Создай React Server Component "PostCard" для Next.js 15 с TypeScript.

Props:
- post: { id, title, content, publishedAt, channel: { name, type }, tags: string[] }

UI должен включать:
- Иконку канала слева (синяя для Telegram, зеленая для RSS)
- Название канала мелким текстом
- Заголовок поста крупно и жирно
- Первые 2 строки контента (обрезать с ...)
- Теги внизу как маленькие бейджи
- Время публикации справа вверху (relative time)

Стиль: Tailwind CSS, светлая карточка с hover эффектом, скругленные углы.
Используй shadcn/ui компоненты: Card, Badge.
```

#### 2. Генерация формы

```
Создай форму "AddTelegramChannelForm" с:
- Input для URL канала (placeholder: t.me/channelname)
- Input для имени канала
- Multi-select для тегов (React, TypeScript, Node.js, etc)
- Чекбокс "Сразу активировать"
- Кнопки "Отмена" и "Добавить"

Используй:
- React Hook Form для управления состоянием
- Zod для валидации
- Server Action для отправки
- shadcn/ui компоненты
- Обработка ошибок с toast notifications
```

#### 3. Генерация страницы

```
Создай страницу Dashboard для Next.js 15 App Router с:

Секции:
1. Приветствие пользователя (имя из session)
2. Саммари за сегодня (карточка с markdown контентом)
3. Статистика по темам (4 карточки в ряд: React, Node, TS, Other)
4. Последние 5 постов (компактный список)

Требования:
- Server Components где возможно
- Suspense для каждой секции с skeleton loaders
- Responsive: мобильный = 1 колонка, desktop = сетка
- TypeScript с proper типами
- Tailwind для стилей
```

### Инструменты для генерации UI

#### v0.dev (от Vercel)

```
https://v0.dev

Prompt example:
"Create a dashboard page for a content aggregator app.
Show summary cards with markdown content, topic filters,
and recent posts list. Use shadcn/ui components, dark mode support."
```

#### Galileo AI

```
https://usegalileo.ai

Хорош для генерации полных layouts и страниц
Экспортирует в React + Tailwind
```

#### Builder.io

```
https://builder.io

Visual editor с AI generation
Экспорт в код
```

---

## Performance Optimization

### 1. Image Optimization

```typescript
import Image from 'next/image';

// Оптимизированные изображения
<Image
  src={channel.avatarUrl}
  alt={channel.name}
  width={48}
  height={48}
  className="rounded-full"
  loading="lazy"
/>
```

### 2. Font Optimization

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter',
});

export default function RootLayout({ children }) {
  return (
    <html className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

### 3. Bundle Size

```bash
# Анализ bundle
npm install @next/bundle-analyzer

# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);

# Запуск
ANALYZE=true npm run build
```

---

## Component Library Structure

```
components/
├── ui/              # shadcn/ui базовые компоненты
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   └── ...
├── layout/          # Layout компоненты
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   └── Footer.tsx
├── dashboard/       # Dashboard специфичные
│   ├── StatCard.tsx
│   ├── SummaryCard.tsx
│   └── TopicStatsGrid.tsx
├── channels/        # Управление каналами
│   ├── ChannelCard.tsx
│   ├── ChannelList.tsx
│   ├── AddChannelDialog.tsx
│   └── ChannelSettings.tsx
├── summaries/       # Саммари компоненты
│   ├── SummaryView.tsx
│   ├── SummaryCard.tsx
│   ├── TopicFilter.tsx
│   └── ExportMenu.tsx
├── posts/           # Посты
│   ├── PostCard.tsx
│   ├── PostsList.tsx
│   └── PostSourceLink.tsx
├── empty/           # Empty states
│   ├── EmptyChannels.tsx
│   ├── EmptySummaries.tsx
│   └── EmptyPosts.tsx
├── error/           # Error states
│   └── ErrorCard.tsx
└── skeletons/       # Loading skeletons
    ├── SummaryCardSkeleton.tsx
    ├── ChannelCardSkeleton.tsx
    └── PostsListSkeleton.tsx
```

---

## Figma Design System (опционально)

### Структура Figma файла

```
Pages:
├── 📐 Design System
│   ├── Colors
│   ├── Typography
│   ├── Spacing
│   ├── Icons
│   └── Components
├── 🖼️ Screens
│   ├── Authentication
│   ├── Dashboard
│   ├── Channels
│   ├── Summaries
│   └── Settings
└── 🎨 Prototypes
```

### Рекомендуемые плагины Figma

- **Tailwind CSS** - для копирования Tailwind классов
- **Stark** - проверка accessibility
- **Contrast** - проверка контрастности
- **Iconify** - библиотека иконок

---

## Быстрый старт с UI

### Шаг 1: Установка UI foundation

```bash
# Создать проект
npx create-next-app@16 devdigest --ts --tailwind --app

# Установить shadcn/ui
npx shadcn-ui@latest init

# Добавить базовые компоненты
npx shadcn-ui@latest add button card dialog input badge skeleton toast

# Установить дополнительные зависимости
npm install lucide-react date-fns react-markdown next-themes sonner
```

### Шаг 2: Настройка dark mode

```typescript
// app/providers.tsx
'use client';
import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
}

// app/layout.tsx
import { Providers } from './providers';
import { Toaster } from 'sonner';

export default function RootLayout({ children }) {
  return (
    <html suppressHydrationWarning>
      <body>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
```

### Шаг 3: Создать базовый layout

```typescript
// components/layout/Sidebar.tsx
// components/layout/Header.tsx
// app/(dashboard)/layout.tsx
```

### Шаг 4: Начать с одной страницы

Рекомендую начать с Dashboard, так как это самая важная страница.

---

## Figma Template (опционально)

Вы можете начать с готового дашборд template и адаптировать под ваши нужды:

**Бесплатные Figma templates**:

- [Tailwind UI Dashboard](https://www.figma.com/community/file/958303829175986582)
- [Dashboard UI Kit](https://www.figma.com/community/file/1145787691859303649)
- [SaaS Dashboard](https://www.figma.com/community/file/1116104896862977851)

**Или создать с нуля с помощью AI**:

- Используйте v0.dev для генерации макетов
- Экспортируйте в Figma с помощью html.to.design
- Доработайте детали вручную

---

## Чек-лист UI качества

### Before Launch

- [ ] Все страницы адаптивны (mobile, tablet, desktop)
- [ ] Dark mode работает везде
- [ ] Loading states для всех async операций
- [ ] Empty states для пустых списков
- [ ] Error boundaries на всех страницах
- [ ] Accessibility score > 90 (Lighthouse)
- [ ] Все изображения оптимизированы
- [ ] Fonts загружаются с font-display: swap
- [ ] No layout shift (CLS < 0.1)
- [ ] Все интерактивные элементы доступны с клавиатуры
- [ ] Focus indicators видимы
- [ ] Toast notifications для всех actions
- [ ] Consistent spacing по всему приложению
- [ ] Анимации не вызывают motion sickness (prefers-reduced-motion)

---

## Полезные ресурсы

### Документация

- [shadcn/ui](https://ui.shadcn.com) - компоненты
- [Tailwind CSS](https://tailwindcss.com) - утилиты
- [Radix UI](https://radix-ui.com) - primitives
- [Lucide Icons](https://lucide.dev) - иконки

### Инструменты

- [v0.dev](https://v0.dev) - AI генерация UI
- [Realtime Colors](https://realtimecolors.com) - визуализация цветовой схемы
- [Coolors](https://coolors.co) - генератор палитр
- [Font Pair](https://fontpair.co) - комбинации шрифтов

### Inspiration

- [Dribbble - Dashboard](https://dribbble.com/search/dashboard)
- [Mobbin](https://mobbin.com) - скриншоты реальных приложений
- [Land-book](https://land-book.com) - landing pages
- [Pages.xyz](https://www.pages.xyz) - примеры дизайна
