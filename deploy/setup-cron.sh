#!/usr/bin/env bash
# setup-cron.sh - register hourly cron job for container updates

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UPDATE_SCRIPT="${SCRIPT_DIR}/update-containers.sh"
CRON_LOG="${SCRIPT_DIR}/cron.log"

# Schedule: every hour at minute 0 (change if needed)
CRON_SCHEDULE="0 * * * *"

if [ ! -x "${UPDATE_SCRIPT}" ]; then
  chmod +x "${UPDATE_SCRIPT}"
  echo "chmod +x ${UPDATE_SCRIPT}"
fi

CRON_LINE="${CRON_SCHEDULE} ${UPDATE_SCRIPT} >> ${CRON_LOG} 2>&1"

(
  crontab -l 2>/dev/null | grep -v "update-containers.sh" || true
  echo "${CRON_LINE}"
) | crontab -

echo "Cron job installed:"
echo "  ${CRON_LINE}"
echo ""
echo "Check: crontab -l"
echo "Cron log: ${CRON_LOG}"
