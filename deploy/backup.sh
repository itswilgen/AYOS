#!/usr/bin/env bash
# Daily AYOS backup: the database and every uploaded file (photos, ID documents), encrypted, then copied
# to Backblaze B2. Keeps 7 daily and 4 weekly (Sunday) copies off the server, and the last 3 on the server.
# Run by cron (see deploy/RUNBOOK.md). Test a restore with deploy/restore-test.sh.
set -euo pipefail
cd "$(dirname "$0")/.."

RCLONE_IMAGE=rclone/rclone:1.75.2
LOCAL_DIR=${BACKUP_LOCAL_DIR:-/var/backups/ayos}
PROJECT=ayos-prod
stamp=$(date -u +%Y%m%dT%H%MZ)
work="$LOCAL_DIR/$stamp"

ENV_FILE=${AYOS_ENV_FILE:-.env}
export AYOS_ENV_FILE=$ENV_FILE
env_value() { grep "^$1=" "$ENV_FILE" | cut -d= -f2-; }
log() { printf '%s %s\n' "$(date -u +%H:%M:%S)" "$1"; }

[ -f "$ENV_FILE" ] || { echo "No $ENV_FILE next to compose.prod.yaml." >&2; exit 1; }
passphrase=$(env_value BACKUP_PASSPHRASE)
[ -n "$passphrase" ] || { echo "BACKUP_PASSPHRASE is empty in .env: backups must be encrypted." >&2; exit 1; }

mkdir -p "$work"
chmod 700 "$LOCAL_DIR"

log "Dumping the database"
docker compose --env-file "$ENV_FILE" -f compose.prod.yaml exec -T postgres pg_dump -U ayos -d ayos --format=custom --no-owner > "$work/database.dump"
[ -s "$work/database.dump" ] || { echo "The database dump is empty." >&2; exit 1; }

log "Packing uploaded files"
docker run --rm -v "${PROJECT}_uploads:/data:ro" alpine:3.22 tar -czf - -C /data . > "$work/uploads.tar.gz"

( cd "$work" && sha256sum database.dump uploads.tar.gz > SHA256SUMS )
log "Local copy ready: $work ($(du -sh "$work" | cut -f1))"

# rclone config comes from environment variables: "b2" is the bucket, "vault" encrypts everything written
# through it (file names too), so Backblaze only ever stores unreadable data.
rclone() {
  local kind=${BACKUP_REMOTE_KIND:-b2}
  docker run --rm -v "$LOCAL_DIR:/backups" \
    -e RCLONE_CONFIG_B2_TYPE="$kind" \
    -e RCLONE_CONFIG_B2_ACCOUNT="$(env_value B2_ACCOUNT_ID)" \
    -e RCLONE_CONFIG_B2_KEY="$(env_value B2_APPLICATION_KEY)" \
    -e RCLONE_CONFIG_VAULT_TYPE=crypt \
    -e RCLONE_CONFIG_VAULT_REMOTE="b2:${BACKUP_REMOTE_ROOT:-$(env_value B2_BUCKET)}/ayos" \
    -e RCLONE_CONFIG_VAULT_PASSWORD="$obscured" \
    ${BACKUP_REMOTE_MOUNT:+-v "$BACKUP_REMOTE_MOUNT:$BACKUP_REMOTE_MOUNT"} \
    "$RCLONE_IMAGE" "$@"
}
obscured=$(docker run --rm "$RCLONE_IMAGE" obscure "$passphrase")

log "Uploading (encrypted) to daily/$stamp"
rclone copy "/backups/$stamp" "vault:daily/$stamp"
if [ "$(date -u +%u)" = 7 ]; then
  log "Sunday: also keeping a weekly copy"
  rclone copy "/backups/$stamp" "vault:weekly/$stamp"
fi

log "Removing old copies (off-server: daily after 7 days, weekly after 4 weeks; on the server: all but the last 3)"
# Only prune folders that exist: "weekly" appears on the first Sunday, and pruning a missing folder fails.
existing=$(rclone lsf --dirs-only vault:)
prune() {
  if printf '%s\n' "$existing" | grep -qx "$1/"; then
    rclone delete --min-age "$2" "vault:$1"
    rclone rmdirs --leave-root "vault:$1"
  fi
}
prune daily 7d
prune weekly 28d
ls -1d "$LOCAL_DIR"/*/ | sort -r | tail -n +4 | xargs rm -rf

log "Backup $stamp done"
