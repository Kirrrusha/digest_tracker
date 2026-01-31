# DevDigest Tracker - Deployment Guide

Руководство по развертыванию на виртуальной машине с использованием Docker.

## Требования к серверу

- Ubuntu 22.04+ / Debian 11+ (или другой Linux)
- Docker 24.0+
- Docker Compose v2
- Минимум 2GB RAM, 20GB диск
- Открытые порты: 80, 443

## Быстрый старт

### 1. Подготовка сервера

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Установка Docker Compose
sudo apt install docker-compose-plugin

# Перелогиниться для применения группы docker
exit
```

### 2. Клонирование проекта

```bash
git clone https://github.com/your-repo/devdigest-tracker.git
cd devdigest-tracker
```

### 3. Настройка окружения

```bash
# Копировать шаблон
cp .env.production.example .env

# Редактировать настройки
nano .env
```

**Обязательные переменные:**

- `NEXTAUTH_URL` - URL вашего сайта (https://your-domain.com)
- `NEXTAUTH_SECRET` - случайная строка (openssl rand -base64 32)
- `POSTGRES_PASSWORD` - пароль для PostgreSQL
- `OPENAI_API_KEY` - ключ OpenAI API
- `TELEGRAM_BOT_TOKEN` - токен Telegram бота

### 4. Первый запуск

```bash
# Сделать скрипты исполняемыми
chmod +x scripts/*.sh

# Сборка и запуск с миграциями
./scripts/deploy.sh --build --migrate
```

### 5. Настройка SSL (Let's Encrypt)

```bash
# Получить сертификат
./scripts/setup-ssl.sh your-domain.com admin@your-domain.com
```

## Структура файлов

```
├── docker-compose.prod.yml   # Production конфигурация
├── Dockerfile                # Образ приложения
├── nginx/
│   ├── nginx.conf           # Основной конфиг nginx
│   └── conf.d/
│       └── default.conf     # Server конфигурация
├── scripts/
│   ├── deploy.sh            # Скрипт деплоя
│   ├── backup.sh            # Бэкап базы данных
│   ├── setup-ssl.sh         # Настройка SSL
│   └── logs.sh              # Просмотр логов
├── certbot/                  # SSL сертификаты
│   ├── conf/
│   └── www/
└── backups/                  # Бэкапы БД
    └── postgres/
```

## Команды управления

### Деплой

```bash
# Обычный деплой
./scripts/deploy.sh

# С пересборкой образа
./scripts/deploy.sh --build

# С миграциями БД
./scripts/deploy.sh --migrate

# С SSL профилем
./scripts/deploy.sh --ssl
```

### Логи

```bash
# Все сервисы
./scripts/logs.sh

# Конкретный сервис
./scripts/logs.sh app
./scripts/logs.sh nginx
./scripts/logs.sh postgres

# Следить за логами
./scripts/logs.sh app --follow

# Последние N строк
./scripts/logs.sh --tail 200
```

### Бэкапы

```bash
# Создать бэкап
./scripts/backup.sh

# Восстановить из бэкапа
./scripts/backup.sh --restore backups/postgres/backup_20240125_120000.sql.gz
```

### Docker Compose

```bash
# Статус сервисов
docker compose -f docker-compose.prod.yml ps

# Остановить все
docker compose -f docker-compose.prod.yml down

# Перезапустить сервис
docker compose -f docker-compose.prod.yml restart app

# Войти в контейнер
docker compose -f docker-compose.prod.yml exec app sh

# Выполнить команду
docker compose -f docker-compose.prod.yml exec app npx prisma studio
```

## Обновление приложения

```bash
# Получить обновления
git pull origin main

# Пересобрать и задеплоить
./scripts/deploy.sh --build --migrate
```

## Автоматический бэкап (cron)

```bash
# Открыть crontab
crontab -e

# Добавить ежедневный бэкап в 3:00
0 3 * * * /path/to/devdigest/scripts/backup.sh >> /var/log/devdigest-backup.log 2>&1
```

## Мониторинг

### Health Check

```bash
curl http://localhost/api/health
```

### Метрики

```bash
curl http://localhost/api/metrics
```

## Устранение неполадок

### Приложение не запускается

```bash
# Проверить логи
./scripts/logs.sh app --tail 100

# Проверить переменные окружения
docker compose -f docker-compose.prod.yml exec app env

# Проверить подключение к БД
docker compose -f docker-compose.prod.yml exec app npx prisma db push --dry-run
```

### Проблемы с SSL

```bash
# Проверить сертификат
docker compose -f docker-compose.prod.yml exec nginx nginx -t

# Перегенерировать сертификат
./scripts/setup-ssl.sh your-domain.com admin@email.com
```

### Очистка диска

```bash
# Удалить неиспользуемые образы
docker image prune -a

# Удалить старые бэкапы (старше 30 дней)
find backups/postgres -name "*.sql.gz" -mtime +30 -delete
```

## Безопасность

1. Регулярно обновляйте систему и Docker
2. Используйте сложные пароли (openssl rand -base64 32)
3. Настройте файрвол (ufw)
4. Регулярно делайте бэкапы
5. Следите за логами на предмет подозрительной активности

```bash
# Базовая настройка UFW
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```
