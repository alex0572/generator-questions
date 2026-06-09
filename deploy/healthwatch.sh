#!/usr/bin/env bash
# healthwatch.sh — проверка /health и перезапуск при сбое
# Запуск вручную или через cron (setup-healthwatch-cron.sh)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"
LOG_FILE="${SCRIPT_DIR}/healthwatch.log"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1/health}"
MAX_RETRIES="${HEALTH_RETRIES:-2}"
RETRY_DELAY="${HEALTH_RETRY_DELAY:-5}"

if [ -f "${SCRIPT_DIR}/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "${SCRIPT_DIR}/.env"
  set +a
fi

if docker compose version &>/dev/null; then
  COMPOSE_CMD=(docker compose -f "${COMPOSE_FILE}")
else
  COMPOSE_CMD=(docker-compose -f "${COMPOSE_FILE}")
fi

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
  echo "$msg"
  echo "$msg" >> "${LOG_FILE}"
}

check_http() {
  if command -v curl &>/dev/null; then
    curl -sf --max-time 10 "${HEALTH_URL}" >/dev/null
    return
  fi
  if command -v wget &>/dev/null; then
    wget -q --timeout=10 --spider "${HEALTH_URL}"
    return
  fi
  log "WARN: curl/wget не найдены, пропуск HTTP-проверки"
  return 1
}

containers_running() {
  local running
  running="$("${COMPOSE_CMD[@]}" ps --status running -q 2>/dev/null | wc -l)"
  [ "${running}" -ge 2 ]
}

restart_stack() {
  log "Перезапуск: docker compose down && up -d"
  cd "${SCRIPT_DIR}"
  "${COMPOSE_CMD[@]}" down
  "${COMPOSE_CMD[@]}" up -d
  sleep 15
}

log "========== Health check =========="

if ! containers_running; then
  log "FAIL: не все контейнеры running"
  restart_stack
  if check_http; then
    log "RECOVERED после перезапуска (контейнеры были down)"
    exit 0
  fi
  log "ERROR: перезапуск не помог"
  exit 1
fi

attempt=1
while [ "${attempt}" -le "${MAX_RETRIES}" ]; do
  if check_http; then
    log "OK: ${HEALTH_URL} (попытка ${attempt})"
    exit 0
  fi
  log "WARN: ${HEALTH_URL} недоступен (попытка ${attempt}/${MAX_RETRIES})"
  attempt=$((attempt + 1))
  [ "${attempt}" -le "${MAX_RETRIES}" ] && sleep "${RETRY_DELAY}"
done

log "FAIL: health endpoint не отвечает — перезапуск стека"
restart_stack

if check_http; then
  log "RECOVERED после перезапуска"
  exit 0
fi

log "ERROR: сервис не восстановился"
exit 1
