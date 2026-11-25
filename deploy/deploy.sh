#!/usr/bin/env bash
# Deploys AYOS on the server: get the latest code, build, run the release step, restart, check health.
# Usage (in the repo folder on the server):  ./deploy/deploy.sh          (pulls main first)
#                                            ./deploy/deploy.sh --no-pull (deploys the code already here)
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE=${AYOS_ENV_FILE:-.env}
export AYOS_ENV_FILE=$ENV_FILE
compose() { docker compose --env-file "$ENV_FILE" -f compose.prod.yaml "$@"; }
step() { printf '\n==> %s\n' "$1"; }

[ -f "$ENV_FILE" ] || { echo "No $ENV_FILE here. Copy deploy/.env.production.example to .env and fill it in first." >&2; exit 1; }
grep -q '^APP_KEY=base64:' "$ENV_FILE" || { echo "APP_KEY is empty in $ENV_FILE (see the comment above it)." >&2; exit 1; }
DOMAIN=$(grep '^DOMAIN=' "$ENV_FILE" | cut -d= -f2-)

if [ "${1:-}" != "--no-pull" ]; then
  step "Getting the latest code from main"
  git pull --ff-only origin main
fi
echo "Deploying $(git rev-parse --short HEAD): $(git log -1 --format=%s)"

step "Building images"
compose build

step "Release step: database migrations and reference data"
compose up -d --wait postgres
compose run --rm backend php artisan migrate --force
compose run --rm backend php artisan db:seed --class=PhilippineGeographySeeder --force
compose run --rm backend php artisan db:seed --class=ServiceCategorySeeder --force

step "Starting the new version, one PHP container at a time"
# While one restarts, Caddy sends everyone to the other, so the site stays up. (Both versions run side by
# side for a few seconds, so a migration must never break the version that is still running.)
compose up -d --wait redis
compose up -d --no-deps --wait backend
compose up -d --no-deps --wait backend-2
compose up -d --remove-orphans
compose ps

step "Health check"
for attempt in $(seq 1 30); do
  # Check Laravel's own words, not just a 200: a misrouted request can also answer 200.
  if curl -fsS --max-time 5 ${HEALTH_INSECURE:+-k} "https://$DOMAIN/up" 2>/dev/null | grep -q "Application up"; then
    echo "AYOS is up at https://$DOMAIN"
    exit 0
  fi
  sleep 2
done
echo "AYOS did not answer at https://$DOMAIN/up within a minute. Check: docker compose -f compose.prod.yaml logs --tail=100" >&2
exit 1
