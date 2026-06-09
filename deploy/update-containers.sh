#!/usr/bin/env bash
# update-containers.sh - pull new images from Docker Hub and restart containers

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "${SCRIPT_DIR}/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "${SCRIPT_DIR}/.env"
  set +a
fi

DOCKER_USER="${DOCKER_USER:-your-docker-hub-username}"
BACKEND_IMAGE="${DOCKER_USER}/questions-backend"
FRONTEND_IMAGE="${DOCKER_USER}/questions-frontend"
IMAGE_TAG="latest"

BACKEND_REF="${BACKEND_IMAGE}:${IMAGE_TAG}"
FRONTEND_REF="${FRONTEND_IMAGE}:${IMAGE_TAG}"

COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"
LOG_FILE="${SCRIPT_DIR}/update.log"

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

get_image_id() {
  local image_ref="$1"
  docker image inspect --format='{{.Id}}' "$image_ref" 2>/dev/null || echo "missing"
}

pull_if_updated() {
  local image_ref="$1"
  local service_name="$2"
  local old_id new_id pull_output

  old_id="$(get_image_id "$image_ref")"
  log "Checking updates: ${image_ref} (current ID: ${old_id})"

  pull_output="$(docker pull "$image_ref" 2>&1)" || {
    log "ERROR: failed to pull ${image_ref}"
    echo "$pull_output"
    return 2
  }

  new_id="$(get_image_id "$image_ref")"

  if echo "$pull_output" | grep -qi "image is up to date"; then
    log "No changes: ${service_name} (${image_ref})"
    return 1
  fi

  if [ "$old_id" = "$new_id" ] && [ "$old_id" != "missing" ]; then
    log "No changes: ${service_name} (ID unchanged)"
    return 1
  fi

  log "Updated: ${service_name} (${image_ref}) | ${old_id} -> ${new_id}"
  return 0
}

main() {
  log "========== Update check started =========="

  cd "${SCRIPT_DIR}"

  local backend_updated=0
  local frontend_updated=0

  if pull_if_updated "${BACKEND_REF}" "backend"; then
    backend_updated=1
  fi

  if pull_if_updated "${FRONTEND_REF}" "frontend"; then
    frontend_updated=1
  fi

  if [ "$backend_updated" -eq 1 ] || [ "$frontend_updated" -eq 1 ]; then
    log "New images found - restarting containers..."

    "${COMPOSE_CMD[@]}" down
    log "Containers stopped (docker compose down)"

    "${COMPOSE_CMD[@]}" up -d
    log "Containers started (docker compose up -d)"

    [ "$backend_updated" -eq 1 ] && log "backend updated and restarted"
    [ "$frontend_updated" -eq 1 ] && log "frontend updated and restarted"
  else
    log "All images are up to date - no restart needed"
  fi

  log "========== Update check finished =========="
}

main "$@"
