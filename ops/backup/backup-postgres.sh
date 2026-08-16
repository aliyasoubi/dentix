#!/usr/bin/env bash
# Takes one encrypted backup of EVERY database this deployment needs to be
# restorable, prunes old ones, and optionally copies them off-host. Run on a
# schedule by entrypoint.sh's cron job, or on demand:
# `docker compose ... exec backup /scripts/backup-postgres.sh`.
#
# Two databases, not one. Keycloak stores users, credentials and TOTP
# enrolments in its own `keycloak` database on the same Postgres instance
# (see ops/postgres-init/10-create-keycloak-db.sh). pg_dump backs up ONE
# database per invocation, so a single dump of the application database
# would restore every patient record and lose every login — the office
# could read its data and nobody could sign in to it.
#
# 06-operations/02-backup-recovery.md's requirements, and how each is met:
#   - Encryption            -> gpg symmetric, AES256, passphrase file (never
#                              an env var — those are readable via `docker
#                              inspect`/`ps aux`; a file is not). pg_dump is
#                              piped straight into gpg so a plaintext dump
#                              never exists on disk at all.
#   - Separate failure domain -> optional rclone copy to BACKUP_RCLONE_REMOTE
#   - Retention tiers       -> BACKUP_RETENTION_DAYS, applied identically
#                              local and remote, per database
#   - Automated monitoring  -> non-zero exit on any failure (set -euo
#                              pipefail) plus an optional healthcheck ping.
#                              Success is only recorded once EVERY database's
#                              encrypted file and checksum exist.
#   - Periodic integrity checks -> sha256 recorded alongside every backup;
#                              restore-postgres.sh re-verifies it before
#                              ever decrypting
# -E (errtrace) matters as much as -e here: bash does NOT inherit an ERR trap
# into shell functions without it, and the dump/encrypt work happens inside
# backup_one(). Without -E a failed pg_dump skipped on_failure entirely and
# left a partial .gpg on the volume with no checksum beside it — caught by
# actually running this against a database with the wrong password, not by
# reading it.
set -Eeuo pipefail

: "${POSTGRES_HOST:?}" "${POSTGRES_PORT:?}" "${POSTGRES_DB:?}" "${POSTGRES_USER:?}" "${POSTGRES_PASSWORD:?}"
: "${BACKUP_ENCRYPTION_PASSPHRASE_FILE:?set BACKUP_ENCRYPTION_PASSPHRASE_FILE to a mounted passphrase file}"

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

# Overridable so a deployment that renames the realm database still gets it
# backed up, but defaulted so no existing .env has to change to be correct.
KEYCLOAK_DB="${KEYCLOAK_DB:-keycloak}"
DATABASES=("$POSTGRES_DB" "$KEYCLOAK_DB")

export PGPASSWORD="${POSTGRES_PASSWORD}"
mkdir -p "$BACKUP_DIR"

PRODUCED=()

ping_healthcheck() {
  # Dead-man's-switch pattern: many people already self-host or use the free
  # tier of a service like this; optional and skipped cleanly when unset
  # rather than treated as a hard dependency, since standing up real alerting
  # infrastructure is explicitly an R6/pre-pilot concern, not a Release 1 one.
  local suffix="${1:-}"
  if [ -n "${BACKUP_HEALTHCHECK_URL:-}" ]; then
    curl -fsS -m 10 --retry 3 "${BACKUP_HEALTHCHECK_URL}${suffix}" -o /dev/null || true
  fi
}

on_failure() {
  echo "dentix-backup: FAILED at $(date -u +%Y-%m-%dT%H:%M:%SZ)" >&2
  # A half-written .gpg from an interrupted run is worse than no file: it
  # would sit next to a valid-looking name and only reveal itself as garbage
  # during a restore. Remove anything produced by THIS run.
  rm -f "${BACKUP_DIR}"/*-"${TIMESTAMP}".dump.gpg "${BACKUP_DIR}"/*-"${TIMESTAMP}".dump.gpg.sha256
  ping_healthcheck "/fail"
}
trap on_failure ERR

backup_one() {
  local db="$1"
  local name="${db}-${TIMESTAMP}.dump.gpg"
  local encrypted="${BACKUP_DIR}/${name}"

  echo "dentix-backup: dumping ${db}@${POSTGRES_HOST}:${POSTGRES_PORT}"

  # Streamed, deliberately. The previous version wrote a plaintext
  # --file=... dump, encrypted it, then rm'd it; a power loss or SIGKILL in
  # that window left unencrypted patient data sitting on the backup volume,
  # which no trap can fully prevent. Piping means the cleartext only ever
  # exists in memory between the two processes. `set -o pipefail` above is
  # what makes a pg_dump failure fail the whole pipeline rather than
  # silently producing a valid encryption of a truncated dump.
  #
  # Custom format (-Fc): compressed and restorable selectively/in parallel,
  # matching what restore-postgres.sh expects.
  pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$db" --format=custom \
    | gpg --batch --yes --passphrase-file "$BACKUP_ENCRYPTION_PASSPHRASE_FILE" \
        --symmetric --cipher-algo AES256 --output "$encrypted"

  # Checksum recorded by bare filename, not absolute path, so `sha256sum -c`
  # works wherever the pair is copied to — an off-host restore runs in a
  # different directory than /backups.
  ( cd "$BACKUP_DIR" && sha256sum "$name" > "${name}.sha256" )

  PRODUCED+=("$encrypted")
  echo "dentix-backup: wrote ${encrypted} ($(du -h "$encrypted" | cut -f1))"

  # Retention is per-database: pruning on a shared glob would let one
  # database's naming pattern delete another's history.
  find "$BACKUP_DIR" -maxdepth 1 -name "${db}-*.dump.gpg*" -mtime "+${RETENTION_DAYS}" -print -delete
}

for db in "${DATABASES[@]}"; do
  backup_one "$db"
done

# Success means EVERY database is restorable, not "the last command exited
# 0". A missing file here is the difference between a real backup and one
# that silently stopped covering the identity provider.
for encrypted in "${PRODUCED[@]}"; do
  if [ ! -s "$encrypted" ] || [ ! -s "${encrypted}.sha256" ]; then
    echo "dentix-backup: expected ${encrypted} and its checksum to exist and be non-empty" >&2
    exit 1
  fi
done

if [ "${#PRODUCED[@]}" -ne "${#DATABASES[@]}" ]; then
  echo "dentix-backup: produced ${#PRODUCED[@]} backups but expected ${#DATABASES[@]}" >&2
  exit 1
fi

# --- off-host copy (second failure domain) ---
if [ -n "${BACKUP_RCLONE_REMOTE:-}" ]; then
  for encrypted in "${PRODUCED[@]}"; do
    rclone copy "$encrypted" "$BACKUP_RCLONE_REMOTE" --config "${RCLONE_CONFIG:-/etc/rclone/rclone.conf}"
    rclone copy "${encrypted}.sha256" "$BACKUP_RCLONE_REMOTE" --config "${RCLONE_CONFIG:-/etc/rclone/rclone.conf}"
  done
  rclone delete "$BACKUP_RCLONE_REMOTE" --min-age "${RETENTION_DAYS}d" --config "${RCLONE_CONFIG:-/etc/rclone/rclone.conf}"
  echo "dentix-backup: synced ${#PRODUCED[@]} backups to ${BACKUP_RCLONE_REMOTE}"
else
  echo "dentix-backup: BACKUP_RCLONE_REMOTE not set — backups are local-only, NOT in a second failure domain yet." >&2
fi

date -u +%Y-%m-%dT%H:%M:%SZ > "${BACKUP_DIR}/.last-success"
ping_healthcheck
echo "dentix-backup: done (${DATABASES[*]})"
