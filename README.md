# NexusRM

NexusRM - профессиональная CRM-система для B2B IT-компаний, digital-агентств, консалтинговых команд и outsourcing-студий. Проект сделан как полноценный hackathon-ready продукт: темный SaaS-интерфейс, backend API, PostgreSQL, авторизация, роли, демо-данные, AI sales mock, публичный API и автоматический production-деплой на сервер.

## Быстрая установка на сервер одной командой

Требования перед запуском:

- VPS на Ubuntu/Debian с root или sudo-доступом.
- DNS A-запись домена уже указывает на IP сервера.
- Открыты порты `80` и `443`.

Запуск:

```bash
curl -fsSL https://raw.githubusercontent.com/Mr-X-01/NexusRM/main/install-server.sh | sudo bash -s -- crm.example.com
```

Замените `crm.example.com` на свой домен. Email для SSL можно не указывать: скрипт сам возьмет `admin@ваш-домен`.

Вариант с email:

```bash
curl -fsSL https://raw.githubusercontent.com/Mr-X-01/NexusRM/main/install-server.sh | sudo bash -s -- crm.example.com admin@example.com
```

После установки откройте:

- CRM: `https://crm.example.com`
- Swagger API: `https://crm.example.com/api/docs`

Демо-вход:

- Admin: `admin@nexusrm.ai` / `admin123`
- Manager: `manager@nexusrm.ai` / `manager123`

Демо-ключ публичного API:

```text
nxrm_demo_public_key
```

## Что делает install-server.sh

Скрипт полностью автоматизирует production-запуск:

- устанавливает системные пакеты;
- устанавливает Docker Engine и Docker Compose plugin, если их нет;
- клонирует репозиторий `https://github.com/Mr-X-01/NexusRM` в `/opt/nexusrm`;
- создает production `.env` с доменом, CORS, JWT-секретами и паролем PostgreSQL;
- собирает Docker-образы backend и frontend;
- запускает PostgreSQL;
- применяет Prisma migrations;
- при первом запуске добавляет демо-пользователей и демо-CRM данные;
- запускает backend, frontend и Caddy;
- автоматически выпускает HTTPS-сертификат Let's Encrypt через Caddy;
- открывает `80/443` в `ufw`, если firewall установлен.

Повторный запуск той же команды работает как обновление. Скрипт сохраняет существующий пароль базы и JWT-секреты, а seed повторно не запускает, чтобы не стереть рабочие CRM-данные.

## Обновление проекта на сервере

```bash
curl -fsSL https://raw.githubusercontent.com/Mr-X-01/NexusRM/main/install-server.sh | sudo bash -s -- crm.example.com admin@example.com
```

## Управление на сервере

```bash
cd /opt/nexusrm
docker compose -f docker-compose.prod.yml --env-file .env ps
docker compose -f docker-compose.prod.yml --env-file .env logs -f
docker compose -f docker-compose.prod.yml --env-file .env restart
docker compose -f docker-compose.prod.yml --env-file .env down
```

Логи Caddy и SSL:

```bash
cd /opt/nexusrm
docker compose -f docker-compose.prod.yml --env-file .env logs -f caddy
```

Если SSL не появился сразу, проверьте DNS:

```bash
dig crm.example.com
curl -I http://crm.example.com
```

## Локальный запуск

Через Docker:

```bash
cp .env.example .env
docker compose up --build
```

Или одной локальной командой:

```bash
sh install.sh
```

Адреса локально:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- Swagger: `http://localhost:4000/api/docs`

## Стек

- Backend: Node.js, NestJS, Prisma, PostgreSQL, Swagger, JWT, bcrypt.
- Frontend: React, TypeScript, Vite, Tailwind CSS, Recharts, lucide-react.
- Security: Helmet, CORS, ValidationPipe, RBAC, API keys, audit logs.
- Deploy: Docker, Docker Compose, Caddy, Let's Encrypt, bash installer.

## Возможности

Полный список возможностей вынесен в [FEATURES.md](FEATURES.md).

Кратко:

- клиенты, контакты, сделки, задачи, активности и заметки;
- роли `admin`, `manager`, `viewer`;
- JWT access/refresh авторизация;
- Kanban pipeline сделок;
- AI sales mock: scoring, health, forecast, follow-up и risk detection;
- публичный API для интеграций с ключом `x-api-key`;
- Swagger/OpenAPI документация;
- адаптивный premium dark UI для демо и презентации.

## Структура проекта

```text
nexusrm/
  backend/                 NestJS REST API, Prisma schema, seed data
  frontend/                React + Vite SaaS interface
  deploy/Caddyfile         HTTPS reverse proxy для production
  docs/                    Architecture, API, security, demo notes
  mobile/                  Mobile roadmap для будущего Expo-приложения
  docker-compose.yml       Локальный Docker Compose
  docker-compose.prod.yml  Production Docker Compose
  install.sh               Локальный Docker installer
  install-server.sh        Серверная установка одной командой
  .env.example             Пример переменных окружения
```

## Безопасность

Секреты не хранятся в репозитории. Серверный инсталлятор генерирует новые JWT-секреты и пароль PostgreSQL при первом запуске. Production `.env` остается только на сервере в `/opt/nexusrm/.env`.

Пароли пользователей хешируются через bcrypt. Приватные маршруты закрыты JWT guard, роли проверяются через RBAC guard, публичные integration routes требуют `x-api-key`, а важные действия попадают в audit logs.
