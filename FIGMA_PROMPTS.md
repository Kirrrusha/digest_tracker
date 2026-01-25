# Промпты для Figma - DevDigest Tracker

## 🎨 Design System

### Prompt 1: Цветовая палитра и стили

```
Create a design system color palette for a modern SaaS dashboard application:

Primary Colors:
- Primary 50: #f0f9ff
- Primary 100: #e0f2fe
- Primary 500: #0ea5e9 (main)
- Primary 600: #0284c7
- Primary 700: #0369a1
- Primary 900: #0c4a6e

Accent Colors:
- Accent 500: #8b5cf6
- Accent 600: #7c3aed

Neutral Colors:
- Neutral 50: #fafafa
- Neutral 100: #f5f5f5
- Neutral 800: #262626
- Neutral 900: #171717

Semantic Colors:
- Success: #22c55e (green-500)
- Error: #ef4444 (red-500)
- Warning: #eab308 (yellow-500)
- Info: #3b82f6 (blue-500)

Create both light and dark theme versions with proper contrast ratios (WCAG AA minimum 4.5:1).
```

### Prompt 2: Типографическая система

```
Design a typography system using Inter font family:

Headings:
- H1: 36px (2.25rem), Bold (700), tight tracking, tight leading
- H2: 30px (1.875rem), Semibold (600), tight tracking
- H3: 24px (1.5rem), Semibold (600)
- H4: 20px (1.25rem), Semibold (600)

Body Text:
- Large: 16px (1rem), Regular (400), relaxed leading
- Default: 14px (0.875rem), Regular (400), normal leading
- Small: 12px (0.75rem), Regular (400), normal leading

Special:
- Caption: 12px, gray text (neutral-600 light / neutral-400 dark)
- Overline: 12px, uppercase, wide tracking, Semibold (600)

Font: Inter (fallback: system-ui, -apple-system, sans-serif)
Mono font: JetBrains Mono, Fira Code, SF Mono

Use proper line heights for readability.
```

### Prompt 3: Spacing System

```
Create a consistent spacing scale for UI components:

- XS: 8px - between tags/badges
- SM: 12px - inside cards/padding
- MD: 16px - between elements
- LG: 24px - sections spacing
- XL: 32px - between major blocks
- 2XL: 48px - major sections

Container padding:
- Mobile: 16px
- Tablet: 24px
- Desktop: 32px

Apply these spacing rules consistently across all components.
```

---

## 📱 Страница Dashboard (Главная)

### Prompt 4: Dashboard Layout - Full Page

```
Design a modern dashboard page for a content aggregation app called "DevDigest Tracker" with these sections:

LAYOUT:
- Left sidebar (64px icons only on mobile, 256px with labels on desktop)
- Top header bar with search, notifications bell, user avatar
- Main content area with scroll

CONTENT SECTIONS:
1. Welcome Header:
   - "Добрый день, [Кирилл]! 👋" (heading 1)
   - Subtitle: "Вот что произошло сегодня в мире разработки"

2. Today's Summary Card:
   - Large rounded card with shadow
   - Title: "Саммари за сегодня"
   - Markdown-formatted content with:
     - H2 headers like "## 🔵 React & Frontend"
     - Bullet points with key highlights
     - "📎 5 источников" footer
   - Action buttons: "Читать полностью", "Экспорт в PDF"

3. Topic Statistics Grid:
   - 4 cards in a row (2x2 on tablet, 1 column on mobile)
   - Each card shows: Topic name, post count, icon
   - Cards: React (12), Node.js (8), TypeScript (5), DevOps (3)

4. Recent Posts List:
   - Header with "Последние посты" and "Все посты →" link
   - 5 compact post cards showing:
     - Channel icon and name
     - Post title
     - Timestamp ("5 минут назад")
     - Tags (#React #Release)

STYLE:
- Modern, clean design inspired by Vercel/Linear
- Light background (#ffffff)
- Cards: white with subtle border (neutral-200)
- Hover states: lift effect + border color change
- Rounded corners (8px)
- Proper spacing between sections (24-32px)
- Responsive grid layout
```

### Prompt 5: Dashboard - Sidebar Component

```
Design a sidebar navigation for dashboard with these menu items:

STRUCTURE:
- Logo/app name at top: "DevDigest" with icon
- Navigation items (icon + label):
  - 🏠 Главная (Home)
  - 📺 Каналы (Channels)
  - 📝 Саммари (Summaries)
  - ⚙️ Настройки (Settings)

- Bottom section:
  - Theme toggle (sun/moon icon)
  - Help button
  - User profile card (avatar + name)

RESPONSIVE:
- Desktop (lg+): Full width 256px, icons + labels
- Mobile: Collapsed to 64px, icons only
- Smooth transition between states

STYLE:
- Vertical layout
- Active state: primary-500 background, white text
- Hover state: subtle neutral-100 background
- Icons: 20px (lucide-react style)
- Text: 14px semibold
- Proper spacing between items (8px)
- Border-right: neutral-200

Include proper focus states for accessibility.
```

### Prompt 6: Dashboard - Summary Card Component

```
Design a detailed summary card component showing aggregated content:

STRUCTURE:
Header:
- Left: "Саммари за сегодня" (text-2xl, bold)
- Right: Date/time "Вчера 23:00" (text-sm, muted)
- Separator line below

Content Area:
- Markdown-styled sections:
  - H2 with emoji: "## 🔵 React & Frontend (5 постов)"
  - Paragraph text (2-3 lines)
  - Bulleted list "Ключевые моменты:"
    - "• Server Components в production"
    - "• useFormStatus hooks"
    - "• 30% faster hydration"
  - Collapsible "Развернуть источники ▼" section

Footer:
- Source counter: "📎 5 источников"
- Action buttons: [Поделиться] [Сохранить]

STYLE:
- White card with border-radius 12px
- Padding: 24px
- Border: 1px neutral-200
- Hover: subtle shadow-md
- Typography: proper hierarchy
- Spacing between sections: 16-24px
- Responsive: stack on mobile

Add dark mode version with neutral-900 background.
```

---

## 📺 Страница Каналов

### Prompt 7: Channels Page Layout

```
Design a channels management page with the following layout:

HEADER:
- Title: "Мои каналы" (heading-2)
- Right side: "+ Добавить канал" button (primary blue)

FILTERS:
- Tab pills: [Все] [Telegram] [RSS]
- Search input: "🔍 Поиск каналов..." (right side)

CHANNEL CARDS GRID:
- Responsive grid: 1 column mobile, 2 columns tablet, 3 columns desktop
- Gap between cards: 16px

CARD STRUCTURE:
Each channel card contains:
- Status indicator (colored dot): 🔵 Active / ⏸️ Paused
- Left side:
  - Channel icon (48px circle, colored background)
  - Channel name (bold, text-lg)
  - URL/source (text-sm, muted)
- Right side:
  - 3-dot menu button (appears on hover)
  - Menu items: ⚙️ Настроить, ▶️ Pause/Resume, 🗑️ Delete

- Tags section: Pill badges (#React #TypeScript #CSS)
- Stats row: "📊 45 постов сегодня • 1.2K за неделю"
- Last update: "Последнее обновление: 5 минут назад" (text-xs, muted)

STATES:
- Active channel: full opacity, hover lift effect
- Paused channel: 60% opacity, gray overlay
- Hover state: border color change (neutral-200 → primary-300)

STYLE:
- Clean, card-based layout
- Proper spacing and padding
- Telegram channels: blue accent (bg-blue-100)
- RSS feeds: green accent (bg-green-100)
```

### Prompt 8: Add Channel Dialog

```
Design a modal dialog for adding new channels:

DIALOG:
- Title: "Добавить новый канал"
- Subtitle: "Добавьте Telegram канал или RSS фид для отслеживания"
- Width: 525px max

TABS:
- Two tabs: [Telegram] [RSS]
- Full-width tab bar

TELEGRAM TAB CONTENT:
- Input: "URL канала" (placeholder: t.me/channelname)
- Input: "Название канала"
- Multi-select dropdown: "Выберите теги"
  - Options: React, TypeScript, Node.js, CSS, etc.
  - Allow multiple selection
- Checkbox: "✓ Сразу активировать"

RSS TAB CONTENT:
- Input: "URL RSS фида" (placeholder: https://example.com/feed.xml)
- Input: "Название" (auto-filled after validation)
- Multi-select: "Теги"
- Checkbox: "✓ Сразу активировать"

FOOTER:
- Left: [Отмена] (ghost button)
- Right: [Добавить канал] (primary button with + icon)

STYLE:
- Modern modal with backdrop blur
- Rounded corners (12px)
- Proper form spacing (16px between fields)
- Input focus states with primary color ring
- Validation error states (red border + message)
```

---

## 📝 Страница Саммари

### Prompt 9: Summaries Page Layout

```
Design a summaries archive page with filtering and timeline:

HEADER:
- Title: "Саммари"
- Right side: [Экспорт ▼] dropdown button

TIME FILTER TABS:
- Pills: [Сегодня] [Неделя] [Месяц]
- Right side: Search input with icon

TOPIC FILTER:
- Label: "Темы:"
- Buttons row: [Все] [#React] [#TypeScript] [#Next.js] [...+15 еще]
- Active topics: filled primary background
- Inactive: outline style

SUMMARIES LIST:
Timeline-style layout with cards:

Each summary card:
- Header row:
  - Left: Date "25 января 2024" (heading-3)
  - Right: Time "Вчера 23:00" (text-sm muted)
- Horizontal separator

- Content sections:
  - Multiple topic blocks (H2 headers):
    - "## 🔵 React & Frontend (5 постов)"
    - Summary paragraph (3-4 lines)
    - Key points list (bullets)

- Collapsible sources:
  - "📎 Источники (5)" with chevron down
  - Expands to show source links

- Footer actions:
  - [Поделиться] [Экспорт] [Сохранить] buttons

SPACING:
- 24px between cards
- Cards have subtle shadow and border
- Hover effect: increase shadow

RESPONSIVE:
- Stack cards vertically
- Full width on mobile
- Max-width container on desktop (1200px)
```

### Prompt 10: Summary Export Menu

```
Design a dropdown menu for exporting summaries:

TRIGGER:
- Button: "Экспорт ▼" (outline style)

MENU ITEMS:
- 📄 Экспорт в PDF
- 📧 Отправить на email
- 📋 Копировать как Markdown
- 🔗 Получить ссылку

Each item:
- Icon (left, 16px)
- Label (14px, semibold)
- Hover state: light blue background

MENU STYLE:
- Dropdown appears below button
- Width: 220px
- Border-radius: 8px
- Shadow: md
- Padding: 4px
- Background: white / dark-neutral-900
```

---

## ⚙️ Страница Настроек

### Prompt 11: Settings Page with Tabs

```
Design a settings page with tabbed interface:

HEADER:
- Title: "Настройки" (heading-2)

TAB NAVIGATION:
Horizontal tabs: [Профиль] [Предпочтения] [Уведомления] [API]
- Active tab: underline with primary color
- Inactive: gray text

CONTENT AREA: "Предпочтения" Tab

Section 1: "Темы и интересы"
- Description: "Выберите темы для персонализации саммари:"
- Checkbox grid (4 columns, 3 rows):
  - ✅ React          ✅ TypeScript    ✅ Next.js
  - ✅ Node.js        ☐ Python        ☐ Rust
  - ☐ Go             ✅ DevOps        ☐ AI/ML
  - ☐ Databases      ✅ CSS           ☐ Security
- [+ Добавить свою тему] link at bottom

Section 2: "Частота саммари"
- Radio buttons (vertical):
  - ⦿ Ежедневно в 20:00
  - ○ Еженедельно (воскресенье)
  - ○ Вручную

Section 3: "Язык саммари"
- Dropdown select: [Русский ▼]
  - Options: Русский, English, Español

FOOTER:
- Sticky bottom bar
- Right aligned: [Отмена] [Сохранить] buttons
- Save button: primary style

STYLE:
- Each section in separate card
- 24px spacing between sections
- Form controls: proper spacing (16px)
- Checkboxes/radios: primary accent color when checked
```

---

## 🎯 UI Components

### Prompt 12: Post Card Component

```
Design a compact post card for the recent posts list:

STRUCTURE:
Horizontal layout:

Left side (icon):
- Circular channel icon (40px)
- Colored background (blue for Telegram, green for RSS)
- Channel emoji or first letter

Center (content):
- Channel name (text-sm, muted) "📺 Frontend Daily"
- Post title (text-base, semibold, 2 lines max with ellipsis)
  "React 19 Release Candidate is out"
- Metadata row:
  - Timestamp: "5 минут назад"
  - Separator: "•"
  - Tags: "#React #Release" (clickable)

Right side:
- Bookmark icon button (ghost, appears on hover)

STATES:
- Default: white/neutral background
- Hover: lift slightly, border color change
- Clicked: navigate to full post

STYLE:
- Border-radius: 8px
- Border: 1px neutral-200
- Padding: 12px
- Height: auto (min 80px)
- Smooth transitions
```

### Prompt 13: Topic Stats Card

```
Design a statistics card for topic metrics:

STRUCTURE:
- Icon/Emoji at top (32px) - represents topic
- Topic name (text-lg, semibold) "React"
- Large number (text-3xl, bold) "12"
- Label below (text-sm, muted) "постов сегодня"
- Mini trend indicator: "↑ +3 за неделю" (green text with arrow)

STYLE:
- Square-ish card (aspect ratio ~1.2:1)
- White background with border
- Hover: lift effect + shadow increase
- Gradient background (subtle): primary-50 to white
- Border-radius: 12px
- Padding: 24px
- Center-aligned text

RESPONSIVE:
- Grid: 4 columns desktop, 2 columns tablet, 1 column mobile
```

### Prompt 14: Empty State Component

```
Design empty state screens for different scenarios:

SCENARIO 1: No Channels

Center content:
- Large icon in circle background (128px total)
  - Icon: Inbox (neutral-400)
  - Circle: neutral-100 background
- Heading (text-2xl, semibold): "Нет каналов"
- Description (text-base, muted, max-width 400px):
  "Добавьте первый канал из Telegram или RSS, чтобы начать получать автоматические саммари"
- Action buttons (horizontal):
  - [+ Добавить канал] (primary, large)
  - [📖 Как это работает?] (outline, large)

SCENARIO 2: No Summaries

Similar layout:
- Icon: FileText in gradient circle (primary-to-accent)
- Heading: "Нет саммари"
- Description: "Саммари генерируются автоматически каждый день в 20:00, или создайте вручную"
- Button: [✨ Создать саммари сейчас] (primary, large)

STYLE:
- Center vertically and horizontally
- Minimum height: 500px
- Ample whitespace
- Soft, friendly tone
```

### Prompt 15: Loading Skeleton Components

```
Design skeleton loading states for:

1. SUMMARY CARD SKELETON:
- Header area: 2 skeleton lines (wide + narrow)
- Separator line
- Content: 4 skeleton lines (varied widths: 100%, 100%, 100%, 75%)
- Footer: 1 skeleton line (narrow)
- Animation: gentle shimmer effect

2. CHANNEL CARD SKELETON:
- Circle skeleton (48px) left side
- 3 lines right side (wide, narrow, narrow)
- Tags row: 3 pill skeletons
- Stats line at bottom

3. POST LIST SKELETON:
- 5 horizontal card skeletons
- Each: circle + 2 lines pattern

STYLE:
- Background: neutral-100 (light) / neutral-800 (dark)
- Shimmer animation: subtle, 2s duration
- Rounded corners match real components
- Proper spacing maintained
```

### Prompt 16: Error State Component

```
Design error state cards for different error types:

STRUCTURE:
Center-aligned card:
- Icon circle (96px):
  - Background: red-100 / red-900 (dark)
  - Icon: Alert/Warning (red-600)
- Heading (text-xl, semibold): Error title
- Description (text-base, muted): Error message
- Action buttons:
  - [🔄 Попробовать снова] (primary)
  - [На главную] (outline)

ERROR TYPES:
1. Network Error:
   - Icon: WifiOff
   - Title: "Проблема с подключением"
   - Message: "Не удалось подключиться к серверу"

2. Auth Error:
   - Icon: Lock
   - Title: "Ошибка авторизации"
   - Message: "Пожалуйста, войдите заново"

3. Not Found:
   - Icon: FileQuestion
   - Title: "Не найдено"
   - Message: "Запрашиваемый ресурс не существует"

STYLE:
- Card padding: 32px
- Max-width: 500px
- Center in viewport
- Soft shadows
```

---

## 🎨 Theme Showcase

### Prompt 17: Light & Dark Mode Comparison

```
Create a side-by-side comparison showing light and dark modes:

LIGHT THEME:
- Background: #ffffff
- Cards: white with neutral-200 border
- Text: neutral-900 (headings), neutral-600 (body)
- Primary buttons: primary-500 (#0ea5e9)
- Hover states: neutral-100 background

DARK THEME:
- Background: #0f172a (slate-950)
- Cards: neutral-900 with neutral-800 border
- Text: neutral-50 (headings), neutral-400 (body)
- Primary buttons: primary-400 (lighter blue)
- Hover states: neutral-800 background

Show both themes for:
- Dashboard page overview
- A summary card
- Channel cards
- Navigation sidebar

Ensure proper contrast ratios (WCAG AA) in both themes.
```

---

## 📐 Responsive Layouts

### Prompt 18: Mobile, Tablet, Desktop Views

```
Design responsive breakpoints for the dashboard:

MOBILE (< 640px):
- Hamburger menu (sidebar in drawer)
- Single column layout
- Full-width cards
- Stacked buttons
- Hidden secondary info

TABLET (768px - 1024px):
- Persistent sidebar with icons only
- 2-column grid for cards
- Horizontal scrolling for filter chips
- Compact padding (24px)

DESKTOP (> 1024px):
- Full sidebar with labels (256px)
- 3-4 column grid
- All content visible
- Generous padding (32px)
- Hover states active

Show the same page (Dashboard) in all three breakpoints to demonstrate responsive behavior.
```

---

## 🎯 Interactive States

### Prompt 19: Button States & Variants

```
Design all button states and variants:

VARIANTS:
1. Primary: blue fill (primary-500)
2. Secondary: gray fill (neutral-200)
3. Outline: transparent with border
4. Ghost: transparent, no border
5. Destructive: red fill (red-500)

STATES (for each variant):
- Default
- Hover (darker shade, lift effect)
- Active (pressed state)
- Focus (ring with primary color)
- Disabled (50% opacity, no pointer)
- Loading (spinner icon + disabled)

SIZES:
- Small: 32px height, 12px text, 8px padding
- Medium: 40px height, 14px text, 12px padding
- Large: 48px height, 16px text, 16px padding

Show all combinations in a organized grid.
```

### Prompt 20: Form Input States

```
Design form input field with all states:

INPUT VARIATIONS:
- Text input
- Email input
- Search input (with icon)
- Textarea
- Select dropdown
- Multi-select with tags
- Checkbox
- Radio button
- Toggle switch

STATES:
- Empty (placeholder visible)
- Filled (with value)
- Focus (primary ring, border highlight)
- Error (red border + error message below)
- Success (green border + check icon)
- Disabled (gray background, no interaction)

STYLE:
- Border-radius: 6px
- Border: 1px neutral-300
- Focus ring: 2px primary-500 with offset
- Height: 40px (inputs)
- Padding: 12px horizontal
- Font: 14px
```

---

## 🎬 Animation Guidelines

### Prompt 21: Micro-interactions

```
Design animation specs for micro-interactions:

1. CARD HOVER:
   - Duration: 200ms
   - Easing: ease-out
   - Transform: translateY(-4px)
   - Shadow: increase from sm to lg

2. BUTTON CLICK:
   - Duration: 150ms
   - Easing: ease-in-out
   - Scale: 0.95 (active state)
   - Return: bounce back to 1

3. MODAL OPEN:
   - Duration: 300ms
   - Backdrop: fade in opacity
   - Modal: slide up + fade in
   - Easing: cubic-bezier(0.4, 0, 0.2, 1)

4. LIST ITEMS APPEAR:
   - Staggered animation
   - Delay: 100ms between items
   - Fade + slide up
   - Duration: 300ms per item

5. LOADING SKELETON:
   - Shimmer effect
   - Duration: 2s infinite
   - Direction: left to right
   - Gradient: gray to white to gray

Create visual examples with timeline indicators.
```

---

## 📱 Mobile-Specific Components

### Prompt 22: Mobile Navigation

```
Design mobile-specific navigation patterns:

BOTTOM TAB BAR (mobile only):
- Fixed at bottom of screen
- 4 main tabs with icons + labels:
  - 🏠 Главная
  - 📺 Каналы
  - 📝 Саммари
  - ⚙️ Настройки
- Active tab: primary color fill + icon
- Inactive: gray icons

MOBILE HEADER:
- Left: Hamburger menu icon
- Center: Page title
- Right: Search icon + Profile avatar

SLIDE-OUT DRAWER:
- Full-height sidebar
- Slides from left
- Backdrop overlay (darkened)
- Contains secondary navigation
- Swipe to close gesture

MOBILE CARDS:
- Full-width (16px side margins)
- Larger touch targets (min 44px)
- Simplified content (hide secondary info)
- Stack vertically
```

---

## Использование промптов

### Для Figma Plugins (FigmaAI, Magician):

Используйте промпты 1-22 последовательно для создания Design System и страниц.

### Для v0.dev:

Объедините несколько связанных промптов (например, 7+8 для страницы каналов).

### Для Galileo AI:

Используйте промпты описания страниц (4, 7, 9, 11) для генерации полных layouts.

### Для ручного дизайна:

Используйте промпты как чек-лист требований к каждому компоненту.

---

## Рекомендуемый порядок работы

1. **Сначала Design System** (промпты 1-3)
2. **Основные компоненты** (промпты 12-16)
3. **Dashboard** (промпты 4-6) - самая важная страница
4. **Channels** (промпты 7-8)
5. **Summaries** (промпты 9-10)
6. **Settings** (промпт 11)
7. **Темы и адаптив** (промпты 17-18)
8. **Интерактивность** (промпты 19-21)
9. **Мобильная версия** (промпт 22)

После каждого промпта проверяйте результат и итерируйте при необходимости.
