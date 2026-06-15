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
  printf "\n[%s] ERROR: %s\n" "$APP_NAME" "$1" >&2
  exit 1
}

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  if [[ -f "$0" ]]; then
    exec sudo -E bash "$0" "$@"
  fi
  fail "run the installer with sudo: curl -fsSL https://raw.githubusercontent.com/Mr-X-01/NexusRM/main/install-server.sh | sudo bash -s -- $DOMAIN"
fi

if [[ -z "$DOMAIN" ]]; then
  cat <<'USAGE'
Usage:
  curl -fsSL https://raw.githubusercontent.com/Mr-X-01/NexusRM/main/install-server.sh | sudo bash -s -- crm.example.com

Optional email for SSL notifications:
  curl -fsSL https://raw.githubusercontent.com/Mr-X-01/NexusRM/main/install-server.sh | sudo bash -s -- crm.example.com admin@example.com
USAGE
  exit 1
fi

DOMAIN="${DOMAIN#http://}"
DOMAIN="${DOMAIN#https://}"
DOMAIN="${DOMAIN%%/*}"
DOMAIN="${DOMAIN%.}"

if [[ ! "$DOMAIN" =~ ^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$ ]]; then
  fail "domain '$DOMAIN' is invalid. Use a real domain like crm.example.com"
fi

if [[ -z "$ACME_EMAIL" ]]; then
  ACME_EMAIL="admin@$DOMAIN"
fi

if ! command -v apt-get >/dev/null 2>&1; then
  fail "this installer supports Ubuntu/Debian servers with apt-get"
fi

log "Installing base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl git openssl lsb-release gnupg

install_docker() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    log "Docker and Docker Compose are already installed"
    return
  fi

  log "Installing Docker Engine and Docker Compose plugin"
  . /etc/os-release
  case "$ID" in
    ubuntu|debian) ;;
    *) fail "unsupported OS '$ID'. Use Ubuntu or Debian." ;;
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
  log "Enabling Docker service"
  systemctl enable --now docker
fi

if command -v ufw >/dev/null 2>&1; then
  log "Opening firewall ports 80 and 443"
  ufw allow OpenSSH >/dev/null 2>&1 || true
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null
  ufw --force enable >/dev/null || true
fi

SERVER_IP="$(curl -fsS --max-time 5 https://api.ipify.org || true)"
DOMAIN_IP="$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk '{print $1; exit}' || true)"
if [[ -n "$SERVER_IP" && -n "$DOMAIN_IP" && "$SERVER_IP" != "$DOMAIN_IP" ]]; then
  log "Warning: $DOMAIN points to $DOMAIN_IP, but this server is $SERVER_IP. SSL will work after DNS points to this server."
fi

log "Cloning or updating repository"
mkdir -p "$(dirname "$APP_DIR")"
if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" fetch --depth=1 origin "$BRANCH"
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  git clone --branch "$BRANCH" --depth=1 "$REPO_URL" "$APP_DIR"
fi

ENV_FILE="$APP_DIR/.env"
FIRST_INSTALL=0
if [[ ! -f "$ENV_FILE" ]]; then
  FIRST_INSTALL=1
fi

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

POSTGRES_USER="${POSTGRES_USER:-nexusrm}"
POSTGRES_DB="${POSTGRES_DB:-nexusrm}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(openssl rand -hex 18)}"
JWT_ACCESS_SECRET="${JWT_ACCESS_SECRET:-$(openssl rand -hex 32)}"
JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-$(openssl rand -hex 32)}"

if [[ -f "$ENV_FILE" ]]; then
  cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d%H%M%S)"
fi

log "Writing production environment"
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

VITE_API_URL=https://$DOMAIN
EOF

cd "$APP_DIR"

log "Building production images"
docker compose -f docker-compose.prod.yml --env-file .env build

log "Starting database"
docker compose -f docker-compose.prod.yml --env-file .env up -d postgres

log "Applying database migrations"
docker compose -f docker-compose.prod.yml --env-file .env run --rm backend npx prisma migrate deploy

if [[ "$FIRST_INSTALL" -eq 1 ]]; then
  log "Seeding demo users and demo CRM data"
  docker compose -f docker-compose.prod.yml --env-file .env run --rm backend npm run seed
else
  log "Existing installation detected: demo seed skipped to preserve CRM data"
fi

log "Starting NexusRM with HTTPS"
docker compose -f docker-compose.prod.yml --env-file .env up -d

log "Deployment status"
docker compose -f docker-compose.prod.yml --env-file .env ps

cat <<EOF

NexusRM is ready.

App:      https://$DOMAIN
Swagger:  https://$DOMAIN/api/docs

Demo login:
  admin@nexusrm.ai / admin123
  manager@nexusrm.ai / manager123

Demo public API key:
  nxrm_demo_public_key

Project directory:
  $APP_DIR

Update command:
  curl -fsSL https://raw.githubusercontent.com/Mr-X-01/NexusRM/main/install-server.sh | sudo bash -s -- $DOMAIN $ACME_EMAIL
EOF
