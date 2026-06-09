#!/usr/bin/env bash
# Первичная настройка сервера. Запуск из /opt/user-questions/deploy
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

if ! command -v docker &>/dev/null; then
  echo "Docker не установлен. Установите Docker и docker compose plugin."
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Создан .env — отредактируйте API_KEY: nano .env"
  chmod 600 .env
fi

mkdir -p logs
chmod +x update-containers.sh setup-cron.sh 2>/dev/null || true

echo "Загрузка образов..."
docker compose pull

echo "Запуск контейнеров..."
docker compose up -d

echo ""
docker compose ps
echo ""
echo "Проверка: curl -s http://127.0.0.1/health"
echo "UI: http://$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')/"
