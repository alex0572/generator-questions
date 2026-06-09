#!/usr/bin/env bash
# setup-healthwatch-cron.sh — cron: проверка здоровья каждые 5 минут

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WATCH_SCRIPT="${SCRIPT_DIR}/healthwatch.sh"
CRON_LOG="${SCRIPT_DIR}/healthwatch-cron.log"

# Каждые 5 минут (измените при необходимости)
CRON_SCHEDULE="*/5 * * * *"

chmod +x "${WATCH_SCRIPT}"

CRON_LINE="${CRON_SCHEDULE} ${WATCH_SCRIPT} >> ${CRON_LOG} 2>&1"

(
  crontab -l 2>/dev/null | grep -v "healthwatch.sh" || true
  echo "${CRON_LINE}"
) | crontab -

echo "Healthwatch cron установлен:"
echo "  ${CRON_LINE}"
echo ""
echo "Логи: ${CRON_LOG} и ${SCRIPT_DIR}/healthwatch.log"
echo "Проверка: crontab -l"
echo "Ручной запуск: ${WATCH_SCRIPT}"
