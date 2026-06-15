# Все возможности NexusRM

Этот файл можно использовать как чеклист для презентации, README, заявки на хакатон или демонстрации продукта.

## CRM-ядро

- Единая база клиентов.
- Карточки клиентов с индустрией, статусом, тегами и health score.
- Контакты клиента с основным контактным лицом.
- Сделки с суммой, стадией, вероятностью, датой закрытия, AI score и уровнем риска.
- Задачи с приоритетами, статусами, дедлайнами, исполнителем и привязкой к клиенту.
- Активности: звонки, риски, предложения и другие события по клиентам.
- Заметки по клиентам.
- Audit logs для важных действий.

## Продажи и pipeline

- Kanban pipeline сделок.
- Стадии продаж: новые лиды, контакт, proposal, negotiation, won/lost.
- Быстрый обзор суммы pipeline и вероятности закрытия.
- Риск-сигналы по сделкам.
- Демо-данные для быстрой презентации без ручного заполнения.

## AI sales mock

- Deal score для оценки вероятности сделки.
- Client health score для оценки состояния клиента.
- Прогноз выручки.
- Follow-up generation для следующего шага менеджера.
- Risk detection для подсветки проблемных клиентов и сделок.
- AI чат с DeepSeek V4 Pro через backend endpoint `/api/ai/chat`.
- Безопасное хранение `DEEPSEEK_API_KEY` только в `.env` на сервере.

## Авторизация и роли

- JWT access token.
- Refresh token flow.
- Роли пользователей: `admin`, `manager`, `viewer`.
- Role-based access control для защищенных API.
- Хеширование паролей через bcrypt.

## Публичный API для интеграций

- API key guard через заголовок `x-api-key`.
- Публичные endpoints для лидов, клиентов, сделок, задач и webhooks.
- Демо API key: `nxrm_demo_public_key`.
- Swagger/OpenAPI документация по адресу `/api/docs`.

## Интерфейс

- Темный premium SaaS-дизайн.
- Красно-черная визуальная айдентика NexusRM.
- Адаптивная верстка под desktop и mobile.
- Дашборд как центр управления продажами.
- Карточки KPI.
- Pipeline и CRM-виджеты.
- Блок публичного API.
- Встроенная API-документация в интерфейсе.
- Ссылка на Swagger из интерфейса.
- Рабочий AI чат с обработкой ошибок, если backend или ключ DeepSeek недоступны.

## Backend

- NestJS REST API.
- Prisma ORM.
- PostgreSQL.
- ValidationPipe с whitelist и запретом лишних полей.
- Helmet security headers.
- CORS через переменную `CORS_ORIGIN`.
- Модульная структура доменов CRM, авторизации, AI, публичного API и админ-панели.

## DevOps и production

- Локальный запуск через `docker compose up --build`.
- Production запуск через `docker-compose.prod.yml`.
- Установка на VPS одной командой из GitHub.
- Автоматическая установка Docker и Docker Compose plugin.
- Автоматическое создание `.env` на сервере.
- Автоматическая генерация JWT-секретов и пароля PostgreSQL.
- Автоматические Prisma migrations.
- Автоматическая проверка backend и `/api/docs` после запуска.
- Автоматический HTTPS через Caddy и Let's Encrypt.
- Reverse proxy для frontend и backend на одном домене.
- Повторный запуск install-команды работает как update и не перетирает CRM-данные.

## Демо-аккаунты

- Админ: `admin@nexusrm.ai` / `admin123`.
- Менеджер: `manager@nexusrm.ai` / `manager123`.

## Что можно развивать дальше

- Реальный AI provider вместо mock-модуля.
- Email и Telegram notifications.
- Импорт лидов из CSV.
- Webhook delivery retry queue.
- Multi-tenant режим для нескольких компаний.
- Expo mobile app.
- Billing и тарифные планы.
