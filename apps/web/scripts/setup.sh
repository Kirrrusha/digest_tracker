#!/bin/bash

# Скрипт для быстрой настройки проекта DevDigest Tracker

set -e

echo "🚀 Начинаем настройку DevDigest Tracker..."

# Проверка наличия pnpm
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm не установлен. Устанавливаю..."
    npm install -g pnpm
fi

# Проверка наличия Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Пожалуйста, установите Docker Desktop."
    echo "   macOS: https://docs.docker.com/desktop/install/mac-install/"
    echo "   Linux: https://docs.docker.com/engine/install/"
    exit 1
fi

echo "✅ pnpm и Docker установлены"

# Запуск Docker контейнеров
echo ""
echo "📦 Запускаю Docker контейнеры (PostgreSQL и Redis)..."
docker-compose up -d

# Ждем пока БД будет готова
echo "⏳ Ожидаю запуска PostgreSQL..."
sleep 5

# Проверка статуса контейнеров
if ! docker-compose ps | grep -q "Up"; then
    echo "❌ Не удалось запустить Docker контейнеры"
    echo "   Проверьте логи: docker-compose logs"
    exit 1
fi

echo "✅ Docker контейнеры запущены"

# Создание .env.local если его нет
if [ ! -f .env.local ]; then
    echo ""
    echo "📝 Создаю .env.local из .env.example..."
    cp .env.example .env.local

    # Генерация NEXTAUTH_SECRET
    SECRET=$(openssl rand -base64 32)

    # macOS и Linux имеют разный синтаксис sed
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/your-secret-key-here-generate-with-openssl-rand-base64-32/$SECRET/" .env.local
    else
        sed -i "s/your-secret-key-here-generate-with-openssl-rand-base64-32/$SECRET/" .env.local
    fi

    echo "✅ Создан .env.local с сгенерированным NEXTAUTH_SECRET"
    echo ""
    echo "⚠️  Важно: Добавьте следующие ключи в .env.local:"
    echo "   - TELEGRAM_BOT_TOKEN (получить у @BotFather)"
    echo "   - OPENAI_API_KEY (получить на platform.openai.com)"
else
    echo "✅ .env.local уже существует"
fi

# Установка зависимостей
echo ""
echo "📦 Устанавливаю зависимости..."
pnpm install

# Инициализация Prisma (если нужно)
if [ ! -d "prisma/migrations" ]; then
    echo ""
    echo "🗄️  Применяю миграции базы данных..."
    pnpm exec prisma migrate dev --name init
else
    echo "✅ Миграции уже применены"
fi

# Генерация Prisma Client
echo ""
echo "🔧 Генерирую Prisma Client..."
pnpm exec prisma generate

echo ""
echo "✅ Настройка завершена!"
echo ""
echo "Следующие шаги:"
echo "1. Отредактируйте .env.local и добавьте TELEGRAM_BOT_TOKEN и OPENAI_API_KEY"
echo "2. Запустите dev сервер: pnpm dev"
echo "3. Откройте http://localhost:3000"
echo ""
echo "Полезные команды:"
echo "  pnpm dev          - Запустить dev сервер"
echo "  pnpm validate     - Проверить качество кода"
echo "  pnpm db:studio    - Открыть Prisma Studio"
echo "  docker-compose ps - Проверить статус контейнеров"
echo ""
echo "📚 Документация:"
echo "  README.md        - Быстрый старт"
echo "  SETUP_GUIDE.md   - Подробная настройка"
echo "  CODE_QUALITY.md  - Качество кода (ESLint, Prettier, Lefthook)"
echo ""
echo "🔧 Git hooks установлены! Код будет проверяться автоматически перед коммитом."
