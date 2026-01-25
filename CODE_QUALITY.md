# Руководство по качеству кода

## Инструменты

### ESLint

Линтер для проверки JavaScript/TypeScript кода на ошибки и стилистические проблемы.

### Prettier

Автоматический форматтер кода для консистентного стиля.

### Lefthook

Менеджер git hooks для автоматической проверки кода перед коммитом и пушем.

---

## Установка

Все зависимости уже включены в `package.json`. Просто установите их:

```bash
pnpm install
```

После установки Lefthook автоматически настроит git hooks благодаря скрипту `prepare`.

---

## Команды

### Линтинг

```bash
# Проверить код на ошибки
pnpm lint

# Автоматически исправить ошибки
pnpm lint:fix
```

### Форматирование

```bash
# Отформатировать весь код
pnpm format

# Проверить форматирование без изменений
pnpm format:check
```

### Проверка типов

```bash
# Проверить TypeScript типы
pnpm type-check
```

### Полная валидация

```bash
# Запустить все проверки (lint + format + types)
pnpm validate
```

---

## Git Hooks

Lefthook автоматически запускает проверки при работе с Git:

### Pre-commit (перед коммитом)

Автоматически запускается при `git commit`:

- ✅ Проверка TypeScript типов
- ✅ Линтинг с автофиксом
- ✅ Форматирование кода
- ✅ Автоматическое добавление исправлений в staged files

### Pre-push (перед пушем)

Автоматически запускается при `git push`:

- ✅ Полная валидация (lint + format + types)
- ✅ Проверка сборки проекта

### Пропуск хуков

В экстренных случаях можно пропустить хуки:

```bash
# Пропустить все хуки для одного коммита
git commit --no-verify -m "emergency fix"

# Или использовать переменную окружения
LEFTHOOK=0 git commit -m "skip hooks"

# Пропустить pre-push
git push --no-verify
```

**⚠️ Используйте это только в крайних случаях!**

---

## Правила ESLint

### TypeScript

- **Неиспользуемые переменные**: Предупреждение (можно игнорировать с префиксом `_`)

  ```typescript
  // ❌ Плохо
  const unusedVar = 123;

  // ✅ Хорошо (игнорируется)
  const _unusedVar = 123;
  ```

- **Explicit any**: Предупреждение

  ```typescript
  // ❌ Избегайте
  function foo(data: any) {}

  // ✅ Предпочтительно
  function foo(data: unknown) {}
  function bar<T>(data: T) {}
  ```

- **Type imports**: Используйте `type` для импорта типов

  ```typescript
  // ❌ Плохо
  // ✅ Хорошо
  import { User, type User } from "./types";
  ```

### React

- **Самозакрывающиеся теги**: Обязательно для компонентов без children

  ```jsx
  // ❌ Плохо
  <Avatar></Avatar>

  // ✅ Хорошо
  <Avatar />
  ```

- **Фигурные скобки**: Только когда необходимо

  ```jsx
  // ❌ Плохо
  <Button title={"Hello"} />

  // ✅ Хорошо
  <Button title="Hello" />
  ```

### Tailwind CSS

- **Порядок классов**: Автоматически сортируется
- **Противоречивые классы**: Ошибка (например, `flex block`)
- **Кастомные классы**: Разрешены (для особых случаев)

### Общие правила

- **console.log**: Предупреждение (используйте `console.warn` или `console.error`)

  ```typescript
  // ⚠️ Предупреждение
  console.log("debug info");

  // ✅ Разрешено
  console.warn("warning message");
  console.error("error message");
  ```

- **var**: Ошибка (используйте `const` или `let`)
- **prefer-const**: Используйте `const` когда возможно

---

## Конфигурация Prettier

### Основные настройки

```json
{
  "semi": true, // Точка с запятой в конце
  "tabWidth": 2, // 2 пробела для отступа
  "singleQuote": false, // Двойные кавычки
  "printWidth": 100, // Максимум 100 символов в строке
  "trailingComma": "es5", // Запятая в конце где возможно
  "arrowParens": "always" // Всегда скобки у стрелочных функций
}
```

### Сортировка импортов

Prettier автоматически сортирует импорты в следующем порядке:

1. React импорты
2. Next.js импорты
3. Внешние библиотеки
4. Внутренние модули (`@/types`, `@/lib`, `@/components`, `@/app`)
5. Относительные импорты

Пример:

```typescript
// Автоматически отсортируется в такой порядок:
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@radix-ui/react-button";
import { cn } from "class-variance-authority";

import { type User } from "@/types/user";
import { db } from "@/lib/db";
import { Header } from "@/components/layout/Header";

import { formatDate } from "./utils";
```

---

## Настройка IDE

### VS Code

Установите расширения:

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)

Создайте `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "never"
  },
  "eslint.validate": ["javascript", "javascriptreact", "typescript", "typescriptreact"],
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

### WebStorm / IntelliJ IDEA

1. **Настройка Prettier**:
   - Settings → Languages & Frameworks → JavaScript → Prettier
   - Указать путь к Prettier: `node_modules/prettier`
   - Включить "On save"

2. **Настройка ESLint**:
   - Settings → Languages & Frameworks → JavaScript → Code Quality Tools → ESLint
   - Automatic ESLint configuration

---

## CI/CD Integration

### GitHub Actions

Пример workflow для проверки качества кода:

```yaml
name: Code Quality

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install

      - name: Run linter
        run: pnpm lint

      - name: Check formatting
        run: pnpm format:check

      - name: Type check
        run: pnpm type-check

      - name: Build
        run: pnpm build
```

---

## Устранение проблем

### ESLint ошибки не исправляются автоматически

```bash
# Попробуйте запустить с флагом --fix
pnpm lint:fix

# Если не помогает, проверьте .eslintrc.json
# Убедитесь что файл не в .eslintignore
```

### Prettier конфликтует с ESLint

Убедитесь что в `.eslintrc.json` есть:

```json
{
  "extends": ["next/core-web-vitals", "prettier"]
}
```

`"prettier"` должен быть последним, чтобы отключить конфликтующие правила ESLint.

### Lefthook не запускается

```bash
# Переустановите hooks
pnpm exec lefthook install

# Проверьте что файл lefthook.yml существует
ls -la lefthook.yml

# Проверьте статус
pnpm exec lefthook run pre-commit
```

### Git hooks слишком медленные

Можете отключить некоторые проверки в `lefthook.yml`:

```yaml
pre-commit:
  commands:
    # Закомментируйте type-check если он медленный
    # type-check:
    #   run: pnpm type-check
```

Или запускайте только на измененных файлах:

```yaml
lint:
  glob: "*.{ts,tsx}"
  run: pnpm eslint {staged_files}
```

---

## Best Practices

### 1. Коммитьте часто

Маленькие коммиты проходят проверку быстрее и проще для ревью.

### 2. Исправляйте ошибки сразу

Не накапливайте lint ошибки. Исправляйте их по мере появления.

### 3. Используйте IDE интеграцию

Настройте форматирование на сохранение в вашей IDE для мгновенной обратной связи.

### 4. Проверяйте перед пушем

Запускайте `pnpm validate` вручную перед созданием PR:

```bash
pnpm validate && pnpm build
```

### 5. Следуйте соглашениям проекта

Все настройки уже оптимизированы для проекта. Не меняйте их без обсуждения с командой.

---

## Дополнительные ресурсы

- [ESLint Rules](https://eslint.org/docs/latest/rules/)
- [Prettier Options](https://prettier.io/docs/en/options.html)
- [Lefthook Documentation](https://github.com/evilmartians/lefthook/blob/master/docs/usage.md)
- [Next.js ESLint](https://nextjs.org/docs/app/building-your-application/configuring/eslint)
- [TypeScript ESLint](https://typescript-eslint.io/)

---

## Чеклист для нового разработчика

- [ ] Установить зависимости: `pnpm install`
- [ ] Проверить что git hooks работают: `git commit --allow-empty -m "test"`
- [ ] Настроить IDE (VS Code / WebStorm)
- [ ] Запустить `pnpm validate` для проверки
- [ ] Прочитать правила ESLint в `.eslintrc.json`
- [ ] Ознакомиться с настройками Prettier в `.prettierrc`

Готово! Теперь вы можете писать чистый и консистентный код! 🎉
