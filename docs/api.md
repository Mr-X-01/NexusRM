# NexusRM API

Swagger доступен по адресу:

```text
http://localhost:4000/api/docs
```

Основные группы маршрутов:

- `/api/auth`: регистрация, вход, обновление токена, выход, текущий пользователь.
- `/api/clients`: список клиентов, профиль, создание, обновление, удаление.
- `/api/deals`: список сделок, сводка pipeline, создание, обновление, удаление.
- `/api/tasks`: список задач, создание, обновление, удаление.
- `/api/ai`: инсайты, оценка сделки, генератор follow-up, AI чат.
- `/api/public`: endpoints интеграций, защищенные API-ключом.
- `/api/admin`: пользователи, системные настройки, API-ключи, сводка и audit logs.

## Авторизация

```text
POST /api/auth/login
```

```json
{
  "email": "admin@nexusrm.ai",
  "password": "admin123"
}
```

Ответ:

```json
{
  "user": {
    "id": "user_id",
    "email": "admin@nexusrm.ai",
    "name": "Алексей Орлов",
    "role": "admin"
  },
  "accessToken": "jwt_access",
  "refreshToken": "jwt_refresh"
}
```

Защищенные маршруты вызываются с заголовком:

```text
Authorization: Bearer <accessToken>
```

Seed-аккаунты:

| Роль | Email | Пароль | Назначение |
| --- | --- | --- | --- |
| `admin` | `admin@nexusrm.ai` | `admin123` | управление системой |
| `manager` | `manager@nexusrm.ai` | `manager123` | работа с CRM |
| `viewer` | `viewer@nexusrm.ai` | `viewer123` | просмотр без админ-доступа |

## Админ API

Все маршруты ниже требуют JWT пользователя с ролью `admin`.

```text
GET /api/admin/overview
GET /api/admin/users
PATCH /api/admin/users/:id
GET /api/admin/settings
PATCH /api/admin/settings
GET /api/admin/api-keys
POST /api/admin/api-keys
PATCH /api/admin/api-keys/:id/toggle
GET /api/admin/audit-logs
```

Пример обновления системных настроек:

```bash
curl -X PATCH http://localhost:4000/api/admin/settings \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceName": "NexusRM Sales Hub",
    "timezone": "Europe/Moscow",
    "currency": "USD",
    "aiEnabled": true,
    "publicApiEnabled": true,
    "registrationEnabled": false,
    "defaultRole": "manager"
  }'
```

Пример создания API-ключа:

```bash
curl -X POST http://localhost:4000/api/admin/api-keys \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Интеграция сайта"}'
```

Полный ключ возвращается только один раз. В базе хранится только `sha256` hash.

## AI чат

```text
POST /api/ai/chat
```

Тело запроса:

```json
{
  "message": "Какие сделки сейчас самые рискованные?"
}
```

Ответ:

```json
{
  "answer": "Краткий ответ AI ассистента по CRM-контексту",
  "model": "deepseek-v4-pro"
}
```

Для живого ответа нужен `DEEPSEEK_API_KEY` в `.env` backend. Без ключа endpoint вернет понятную ошибку настройки.

Демо-ключ публичного API после seed:

```text
nxrm_demo_public_key
```

## Публичный API

Публичные маршруты интеграций требуют заголовок:

```text
x-api-key: nxrm_demo_public_key
```

Пример создания лида:

```bash
curl -X POST http://localhost:4000/api/public/leads \
  -H "x-api-key: nxrm_demo_public_key" \
  -H "Content-Type: application/json" \
  -d '{
    "company": "Acme Systems",
    "email": "ops@acme.com",
    "message": "Нужна CRM для delivery-команды"
  }'
```
