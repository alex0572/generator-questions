#!/usr/bin/env bash
# build-and-push.sh - build and push production images to Docker Hub

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [ -f "${SCRIPT_DIR}/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "${SCRIPT_DIR}/.env"
  set +a
fi

DOCKER_USER="${DOCKER_USER:-}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

if [ -z "${DOCKER_USER}" ] || [ "${DOCKER_USER}" = "your-docker-hub-username" ]; then
  echo "ERROR: задайте DOCKER_USER в deploy/.env"
  echo "  cp .env.example .env && nano .env"
  exit 1
fi

BACKEND_IMAGE="${DOCKER_USER}/questions-backend:${IMAGE_TAG}"
FRONTEND_IMAGE="${DOCKER_USER}/questions-frontend:${IMAGE_TAG}"

echo "=== Building backend: ${BACKEND_IMAGE} ==="
docker build -f "${ROOT_DIR}/Dockerfile.prod" -t "${BACKEND_IMAGE}" "${ROOT_DIR}"

echo "=== Building frontend: ${FRONTEND_IMAGE} ==="
docker build -f "${ROOT_DIR}/frontend/Dockerfile.prod" -t "${FRONTEND_IMAGE}" "${ROOT_DIR}/frontend"

echo "=== Pushing to Docker Hub ==="
docker push "${BACKEND_IMAGE}"
docker push "${FRONTEND_IMAGE}"

echo "=== Done ==="
echo "  ${BACKEND_IMAGE}"
echo "  ${FRONTEND_IMAGE}"
