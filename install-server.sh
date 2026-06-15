#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="NexusRM"
REPO_URL="https://github.com/Mr-X-01/NexusRM.git"
BRANCH="${NEXUSRM_BRANCH:-main}"
APP_DIR="${NEXUSRM_DIR:-/opt/nexusrm}"
DOMAIN="${1:-}"
ACME_EMAIL="${2:-}"

log() {
  printf "\n[%s] %s\n" "$APP_NAME" "$1"
}

fail() {
  printf "\n[%s] ОШИБКА: %s\n" "$APP_NAME" "$1" >&2
  exit 1
}

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  if [[ -f "$0" ]]; then
    exec sudo -E bash "$0" "$@"
  fi
  fail "запустите установщик через sudo: curl -fsSL https://raw.githubusercontent.com/Mr-X-01/NexusRM/main/install-server.sh | sudo bash -s -- $DOMAIN"
fi

if [[ -z "$DOMAIN" ]]; then
  cat <<'USAGE'
Использование:
  curl -fsSL https://raw.githubusercontent.com/Mr-X-01/NexusRM/main/install-server.sh | sudo bash -s -- crm.example.com

Опциональный email для SSL-уведомлений:
  curl -fsSL https://raw.githubusercontent.com/Mr-X-01/NexusRM/main/install-server.sh | sudo bash -s -- crm.example.com admin@example.com
USAGE
  exit 1
fi

DOMAIN="${DOMAIN#http://}"
DOMAIN="${DOMAIN#https://}"
DOMAIN="${DOMAIN%%/*}"
DOMAIN="${DOMAIN%.}"

if [[ ! "$DOMAIN" =~ ^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$ ]]; then
  fail "домен '$DOMAIN' некорректен. Используйте реальный домен вроде crm.example.com"
fi

if [[ -z "$ACME_EMAIL" ]]; then
  ACME_EMAIL="admin@$DOMAIN"
fi

if ! command -v apt-get >/dev/null 2>&1; then
  fail "установщик поддерживает Ubuntu/Debian серверы с apt-get"
fi

log "Устанавливаю базовые пакеты"
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl git openssl lsb-release gnupg

install_docker() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    log "Docker и Docker Compose уже установлены"
    return
  fi

  log "Устанавливаю Docker Engine и Docker Compose plugin"
  . /etc/os-release
  case "$ID" in
    ubuntu|debian) ;;
    *) fail "неподдерживаемая ОС '$ID'. Используйте Ubuntu или Debian." ;;
  esac

  apt-get remove -y docker.io docker-compose docker-compose-v2 docker-doc podman-docker containerd runc >/dev/null 2>&1 || true
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/$ID/gpg" -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc

  DOCKER_SUITE="${UBUNTU_CODENAME:-$VERSION_CODENAME}"
  cat >/etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/$ID
Suites: $DOCKER_SUITE
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
}

install_docker

if command -v systemctl >/dev/null 2>&1; then
  log "Включаю сервис Docker"
  systemctl enable --now docker
fi

if command -v ufw >/dev/null 2>&1; then
  log "Открываю порты firewall 80 и 443"
  ufw allow OpenSSH >/dev/null 2>&1 || true
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null
  ufw --force enable >/dev/null || true
fi

SERVER_IP="$(curl -fsS --max-time 5 https://api.ipify.org || true)"
DOMAIN_IP="$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk '{print $1; exit}' || true)"
if [[ -n "$SERVER_IP" && -n "$DOMAIN_IP" && "$SERVER_IP" != "$DOMAIN_IP" ]]; then
  log "Предупреждение: $DOMAIN указывает на $DOMAIN_IP, а IP этого сервера $SERVER_IP. SSL заработает после того, как DNS будет указывать на этот сервер."
fi

log "Клонирую или обновляю репозиторий"
mkdir -p "$(dirname "$APP_DIR")"
if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" fetch --depth=1 origin "$BRANCH"
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  git clone --branch "$BRANCH" --depth=1 "$REPO_URL" "$APP_DIR"
fi

ENV_FILE="$APP_DIR/.env"

get_env_value() {
  local key="$1"
  if [[ -f "$ENV_FILE" ]]; then
    awk -F= -v key="$key" '$1 == key {sub(/^[^=]*=/, ""); print; exit}' "$ENV_FILE"
  fi
}

POSTGRES_USER="$(get_env_value POSTGRES_USER || true)"
POSTGRES_PASSWORD="$(get_env_value POSTGRES_PASSWORD || true)"
POSTGRES_DB="$(get_env_value POSTGRES_DB || true)"
JWT_ACCESS_SECRET="$(get_env_value JWT_ACCESS_SECRET || true)"
JWT_REFRESH_SECRET="$(get_env_value JWT_REFRESH_SECRET || true)"
EXISTING_DEEPSEEK_API_KEY="$(get_env_value DEEPSEEK_API_KEY || true)"
EXISTING_DEEPSEEK_BASE_URL="$(get_env_value DEEPSEEK_BASE_URL || true)"
EXISTING_DEEPSEEK_MODEL="$(get_env_value DEEPSEEK_MODEL || true)"

POSTGRES_USER="${POSTGRES_USER:-nexusrm}"
POSTGRES_DB="${POSTGRES_DB:-nexusrm}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(openssl rand -hex 18)}"
JWT_ACCESS_SECRET="${JWT_ACCESS_SECRET:-$(openssl rand -hex 32)}"
JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-$(openssl rand -hex 32)}"
DEEPSEEK_API_KEY="${DEEPSEEK_API_KEY:-$EXISTING_DEEPSEEK_API_KEY}"
DEEPSEEK_BASE_URL="${DEEPSEEK_BASE_URL:-${EXISTING_DEEPSEEK_BASE_URL:-https://api.deepseek.com}}"
DEEPSEEK_MODEL="${DEEPSEEK_MODEL:-${EXISTING_DEEPSEEK_MODEL:-deepseek-v4-pro}}"

if [[ -f "$ENV_FILE" ]]; then
  cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d%H%M%S)"
fi

log "Создаю production окружение"
cat >"$ENV_FILE" <<EOF
NODE_ENV=production
DOMAIN=$DOMAIN
ACME_EMAIL=$ACME_EMAIL

BACKEND_PORT=4000
POSTGRES_USER=$POSTGRES_USER
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=$POSTGRES_DB
DATABASE_URL=postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@postgres:5432/$POSTGRES_DB?schema=public
JWT_ACCESS_SECRET=$JWT_ACCESS_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
CORS_ORIGIN=https://$DOMAIN
DEEPSEEK_API_KEY=$DEEPSEEK_API_KEY
DEEPSEEK_BASE_URL=$DEEPSEEK_BASE_URL
DEEPSEEK_MODEL=$DEEPSEEK_MODEL

VITE_API_URL=https://$DOMAIN
EOF

cd "$APP_DIR"

log "Собираю production образы"
docker compose -f docker-compose.prod.yml --env-file .env build

log "Запускаю базу данных"
docker compose -f docker-compose.prod.yml --env-file .env up -d postgres

log "Применяю миграции базы данных"
docker compose -f docker-compose.prod.yml --env-file .env run --rm -T backend npx prisma migrate deploy < /dev/null

log "Проверяю, нужны ли демо-данные"
set +e
docker compose -f docker-compose.prod.yml --env-file .env run --rm -T backend node -e 'const { PrismaClient } = require("@prisma/client"); const prisma = new PrismaClient(); prisma.user.count().then(async (count) => { await prisma.$disconnect(); process.exit(count > 0 ? 0 : 10); }).catch(async (error) => { console.error(error); await prisma.$disconnect().catch(() => {}); process.exit(1); });' < /dev/null
SEED_CHECK_EXIT=$?
set -e

if [[ "$SEED_CHECK_EXIT" -eq 10 ]]; then
  log "Добавляю демо-пользователей и демо-данные CRM"
  docker compose -f docker-compose.prod.yml --env-file .env run --rm -T backend npm run seed < /dev/null
elif [[ "$SEED_CHECK_EXIT" -eq 0 ]]; then
  log "В базе уже есть пользователи: CRM-данные не перезаписываю, обновляю только системные аккаунты и настройки"
  docker compose -f docker-compose.prod.yml --env-file .env run --rm -T backend npm run seed:system < /dev/null
else
  fail "не удалось проверить состояние базы перед seed"
fi

log "Запускаю NexusRM с HTTPS"
docker compose -f docker-compose.prod.yml --env-file .env up -d

log "Проверяю backend и Swagger"
set +e
docker compose -f docker-compose.prod.yml --env-file .env exec -T backend node -e 'fetch("http://127.0.0.1:4000/api/docs").then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1));' < /dev/null
DOCS_CHECK_EXIT=$?
set -e
if [[ "$DOCS_CHECK_EXIT" -ne 0 ]]; then
  docker compose -f docker-compose.prod.yml --env-file .env logs --tail=120 backend caddy
  fail "Swagger /api/docs не отвечает. Проверьте логи выше."
fi

log "Статус деплоя"
docker compose -f docker-compose.prod.yml --env-file .env ps

cat <<EOF

NexusRM готов.

Приложение: https://$DOMAIN
Swagger:    https://$DOMAIN/api/docs

Демо-вход:
  admin@nexusrm.ai / admin123      Алексей Орлов, admin
  manager@nexusrm.ai / manager123  Мария Чен, manager
  viewer@nexusrm.ai / viewer123    Илья Соколов, viewer

Демо-ключ публичного API:
  nxrm_demo_public_key

Директория проекта:
  $APP_DIR

DeepSeek:
  ${DEEPSEEK_API_KEY:+ключ настроен}${DEEPSEEK_API_KEY:-ключ не настроен}

Команда обновления:
  curl -fsSL https://raw.githubusercontent.com/Mr-X-01/NexusRM/main/install-server.sh | sudo bash -s -- $DOMAIN $ACME_EMAIL
EOF
