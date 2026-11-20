#!/bin/sh
set -eu
umask 077

: "${BACKUP_PROD_DATABASE_URL:?Falta BACKUP_PROD_DATABASE_URL}"
: "${BACKUP_TEST_DATABASE_URL:?Falta BACKUP_TEST_DATABASE_URL}"
backup_directory=${BACKUP_DIRECTORY:-/backups}
retention_days=${RETENTION_DAYS:-14}
case "$retention_days" in
  ''|*[!0-9]*) echo "RETENTION_DAYS debe ser un entero positivo." >&2; exit 1 ;;
esac
if [ "$retention_days" -lt 1 ] || [ "$retention_days" -gt 365 ]; then
  echo "RETENTION_DAYS debe estar entre 1 y 365." >&2
  exit 1
fi

mkdir -p "$backup_directory"
chmod 700 "$backup_directory"
timestamp=$(date -u +%Y-%m-%dT%H-%M-%S-%3NZ)
temporary_path=
trap 'if [ -n "$temporary_path" ]; then rm -f "$temporary_path"; fi' EXIT HUP INT TERM
for kind in prod test; do
  if [ "$kind" = prod ]; then database_url=$BACKUP_PROD_DATABASE_URL; else database_url=$BACKUP_TEST_DATABASE_URL; fi
  backup_path="$backup_directory/fragments-$kind-$timestamp.dump"
  temporary_path="$backup_path.partial"
  pg_dump --format=custom --no-owner --no-acl --file="$temporary_path" "$database_url"
  pg_restore --list "$temporary_path" >/dev/null
  mv -- "$temporary_path" "$backup_path"
  temporary_path=
  chmod 600 "$backup_path"
  bytes=$(wc -c < "$backup_path" | tr -d ' ')
  digest=$(sha256sum < "$backup_path" | cut -d ' ' -f 1)
  printf 'backup_ok file=%s bytes=%s sha256=%s retention_days=%s\n' "$(basename "$backup_path")" "$bytes" "$digest" "$retention_days"
done
find "$backup_directory" -maxdepth 1 -type f -name 'fragments-*.dump' -mtime "+$retention_days" -delete
