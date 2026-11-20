#!/bin/sh
set -eu
umask 077

: "${RESTORE_DATABASE_URL:?Falta RESTORE_DATABASE_URL}"
backup_directory=${BACKUP_DIRECTORY:-/backups}
connection_base=${RESTORE_DATABASE_URL%%\?*}
created=0
temporary_database=
cleanup() {
  if [ "$created" -eq 1 ]; then dropdb --if-exists --maintenance-db "$RESTORE_DATABASE_URL" "$temporary_database" >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT HUP INT TERM

for kind in prod test; do
  backup_file=$(find "$backup_directory" -maxdepth 1 -type f -name "fragments-$kind-*.dump" -printf '%T@ %p\n' | sort -nr | head -n 1 | cut -d ' ' -f 2-)
  if [ -z "$backup_file" ]; then
    echo "No hay backup PostgreSQL de $kind para validar." >&2
    exit 1
  fi
  temporary_database="fragments_restore_${kind}_$(date -u +%Y%m%d%H%M%S)_$$"
  restore_url="${connection_base%/*}/$temporary_database"
  createdb --maintenance-db "$RESTORE_DATABASE_URL" --owner fragments_restore "$temporary_database"
  created=1
  pg_restore --exit-on-error --no-owner --no-acl --dbname "$restore_url" "$backup_file"
  user_table=$(psql "$restore_url" --no-align --tuples-only --command "SELECT to_regclass('public.user') IS NOT NULL")
  migrations=$(psql "$restore_url" --no-align --tuples-only --command "SELECT to_regclass('public._prisma_migrations') IS NOT NULL")
  if [ "$user_table" != "t" ] || [ "$migrations" != "t" ]; then
    echo "El restore $kind no contiene tablas de Better Auth y Prisma." >&2
    exit 1
  fi
  digest=$(sha256sum < "$backup_file" | cut -d ' ' -f 1)
  printf 'restore_ok database=%s sha256=%s\n' "$temporary_database" "$digest"
  dropdb --maintenance-db "$RESTORE_DATABASE_URL" "$temporary_database"
  created=0
done
