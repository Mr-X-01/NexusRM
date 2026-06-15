#!/usr/bin/env sh
set -eu

if ! command -v docker >/dev/null 2>&1; then
  echo "Нужен Docker. Установите Docker Desktop или Docker Engine и запустите скрипт снова."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Нужен Docker Compose v2. Установите его и запустите скрипт снова."
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Создан .env из .env.example"
fi

docker compose up --build -d
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run seed

echo ""
echo "NexusRM готов:"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:4000"
echo "Swagger:  http://localhost:4000/api/docs"
