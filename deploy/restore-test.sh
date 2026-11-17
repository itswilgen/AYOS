#!/usr/bin/env bash
# Proves a backup can be restored: downloads the newest off-server copy (or uses a local folder), checks it,
# restores the database into a throwaway PostgreSQL and counts the main records. The live site is not touched.
# Usage:  ./deploy/restore-test.sh                  (newest copy from Backblaze)
#         ./deploy/restore-test.sh /var/backups/ayos/20261118T0200Z
set -euo pipefail
cd "$(dirname "$0")/.."

RCLONE_IMAGE=rclone/rclone:1.75.2
ENV_FILE=${AYOS_ENV_FILE:-.env}
export AYOS_ENV_FILE=$ENV_FILE
env_value() { grep "^$1=" "$ENV_FILE" | cut -d= -f2-; }
log() { printf '%s %s\n' "$(date -u +%H:%M:%S)" "$1"; }

scratch=$(mktemp -d)
container="ayos-restore-test-$$"
cleanup() { docker rm -f "$container" >/dev/null 2>&1 || true; rm -rf "$scratch"; }
trap cleanup EXIT

if [ -n "${1:-}" ]; then
  cp "$1"/* "$scratch/"
  log "Using local backup $1"
else
  obscured=$(docker run --rm "$RCLONE_IMAGE" obscure "$(env_value BACKUP_PASSPHRASE)")
  vault() {
    docker run --rm -v "$scratch:/restore" \
      -e RCLONE_CONFIG_B2_TYPE="${BACKUP_REMOTE_KIND:-b2}" \
      -e RCLONE_CONFIG_B2_ACCOUNT="$(env_value B2_ACCOUNT_ID)" \
      -e RCLONE_CONFIG_B2_KEY="$(env_value B2_APPLICATION_KEY)" \
      -e RCLONE_CONFIG_VAULT_TYPE=crypt \
      -e RCLONE_CONFIG_VAULT_REMOTE="b2:${BACKUP_REMOTE_ROOT:-$(env_value B2_BUCKET)}/ayos" \
      -e RCLONE_CONFIG_VAULT_PASSWORD="$obscured" \
      ${BACKUP_REMOTE_MOUNT:+-v "$BACKUP_REMOTE_MOUNT:$BACKUP_REMOTE_MOUNT"} \
      "$RCLONE_IMAGE" "$@"
  }
  latest=$(vault lsf --dirs-only vault:daily | sort | tail -1)
  [ -n "$latest" ] || { echo "No backups found off the server." >&2; exit 1; }
  log "Downloading and decrypting daily/$latest"
  vault copy "vault:daily/$latest" /restore
fi

log "Checking file checksums"
( cd "$scratch" && sha256sum -c SHA256SUMS )

log "Checking the uploads archive opens"
files=$(tar -tzf "$scratch/uploads.tar.gz" | grep -vc '/$' || true)
echo "  uploaded files in the archive: $files"

log "Restoring the database into a throwaway PostgreSQL"
docker run -d --name "$container" -e POSTGRES_PASSWORD=restore-test -e POSTGRES_DB=ayos postgres:17.11-alpine >/dev/null
until docker exec "$container" pg_isready -U postgres -d ayos >/dev/null 2>&1; do sleep 1; done
sleep 2
docker exec -i "$container" pg_restore -U postgres -d ayos --no-owner --exit-on-error < "$scratch/database.dump"

log "Counting records in the restored copy"
docker exec "$container" psql -U postgres -d ayos -At -c "
  select 'users: '            || count(*) from users
  union all select 'providers: '        || count(*) from provider_profiles
  union all select 'service requests: ' || count(*) from service_requests
  union all select 'jobs: '             || count(*) from provider_jobs
  union all select 'messages: '         || count(*) from conversation_messages
  union all select 'barangays: '        || count(*) from barangays
  union all select 'migrations: '       || count(*) from migrations;" | sed 's/^/  /'

log "Restore test passed. Compare the counts with the live admin dashboard."
