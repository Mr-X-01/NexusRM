#!/usr/bin/env sh
set -eu

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Install Docker Desktop and rerun this script."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose is required. Install Docker Compose v2 and rerun this script."
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

docker compose up --build -d
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run seed

echo ""
echo "NexusRM is ready:"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:4000"
echo "Swagger:  http://localhost:4000/api/docs"
