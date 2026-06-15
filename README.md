# NexusRM

NexusRM is a premium dark SaaS CRM for B2B IT companies, digital agencies, consulting teams and outsourcing studios. It combines clients, deals, tasks, activities, AI sales guidance and a public integration API in one deployable hackathon-ready product.

## Highlights

- JWT auth with refresh tokens and roles: `admin`, `manager`, `viewer`
- Clients, contacts, notes, activities, tasks and Kanban deal pipeline
- AI mock module for deal score, client health, revenue forecast, follow-up generation and risk detection
- Public CRM API with API key authentication for leads, clients, deals, tasks and webhooks
- Swagger/OpenAPI docs at `http://localhost:4000/api/docs`
- PostgreSQL + Prisma, Docker Compose and seed demo data
- Premium black-red responsive React UI built for a SaaS product demo

## Stack

- Backend: Node.js, NestJS, Prisma, PostgreSQL, Swagger, JWT, bcrypt
- Frontend: React, TypeScript, Vite, Tailwind CSS, shadcn-style UI primitives, Recharts
- Security: Helmet, CORS, validation pipes, RBAC, rate limiting, audit logs, API keys
- Deploy: Docker, docker-compose, `install.sh`

## Quick Start

```bash
cp .env.example .env
docker compose up --build
```

Then open:

- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- Swagger: http://localhost:4000/api/docs

## Demo Login

- Admin: `admin@nexusrm.ai` / `admin123`
- Manager: `manager@nexusrm.ai` / `manager123`

## Project Structure

```text
nexusrm/
  backend/       NestJS REST API, Prisma schema, seed data
  frontend/      React + Vite premium SaaS interface
  mobile/        Mobile roadmap for future Expo app
  docs/          Architecture, API and security notes
  docker-compose.yml
  install.sh
  .env.example
```

## Architecture

NexusRM uses a modular API around CRM domains: Auth, Clients, Deals, Tasks, AI, Public API and Admin. Prisma owns data access and SQL injection protection. The frontend consumes the same domain vocabulary with a polished demo experience that can later be wired to live API calls screen by screen.

## Security

No secrets are committed. Use `.env` locally and rotate the example values before deployment. Passwords are hashed with bcrypt, access to protected routes goes through JWT guards, privileged screens use role checks, public integration routes require API keys, and audit logs capture sensitive business actions.

## Screenshots

Place final hackathon screenshots under `docs/screenshots/` after running the app:

- Dashboard command center
- Client profile
- Deals Kanban pipeline
- AI Assistant
- Swagger docs
