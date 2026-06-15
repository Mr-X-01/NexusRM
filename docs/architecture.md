# NexusRM Architecture

NexusRM is organized as a two-app workspace:

- `backend/`: NestJS REST API with Prisma and PostgreSQL
- `frontend/`: React + Vite app with premium black-red CRM UI

The backend is split by product surfaces: auth, clients, deals, tasks, AI, public API and admin. Prisma owns persistence, model constraints and database access. Swagger exposes the complete REST surface.

The frontend is a product demo shell with code-native navigation, charts, Kanban pipeline, AI recommendations, client profile, public API docs and admin views. Demo data mirrors the seed data so the app is useful before API wiring is expanded screen by screen.

## Data Flow

1. User authenticates through `/api/auth/login`.
2. Protected CRM routes require Bearer JWT access tokens.
3. Refresh tokens are hashed before storage.
4. Public integration routes use `x-api-key`.
5. Mutating business actions create audit logs.
6. AI endpoints compute deterministic demo scores and recommendations from CRM data.
