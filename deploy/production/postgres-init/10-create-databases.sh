#!/bin/sh
set -eu

: "${FRAGMENTS_PROD_MIGRATOR_PASSWORD:?Falta FRAGMENTS_PROD_MIGRATOR_PASSWORD}"
: "${FRAGMENTS_PROD_RUNTIME_PASSWORD:?Falta FRAGMENTS_PROD_RUNTIME_PASSWORD}"
: "${FRAGMENTS_PROD_BACKUP_PASSWORD:?Falta FRAGMENTS_PROD_BACKUP_PASSWORD}"
: "${FRAGMENTS_TEST_MIGRATOR_PASSWORD:?Falta FRAGMENTS_TEST_MIGRATOR_PASSWORD}"
: "${FRAGMENTS_TEST_RUNTIME_PASSWORD:?Falta FRAGMENTS_TEST_RUNTIME_PASSWORD}"
: "${FRAGMENTS_TEST_BACKUP_PASSWORD:?Falta FRAGMENTS_TEST_BACKUP_PASSWORD}"
: "${FRAGMENTS_RESTORE_PASSWORD:?Falta FRAGMENTS_RESTORE_PASSWORD}"

psql --set=ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=prod_migrator_password="$FRAGMENTS_PROD_MIGRATOR_PASSWORD" \
  --set=prod_runtime_password="$FRAGMENTS_PROD_RUNTIME_PASSWORD" \
  --set=prod_backup_password="$FRAGMENTS_PROD_BACKUP_PASSWORD" \
  --set=test_migrator_password="$FRAGMENTS_TEST_MIGRATOR_PASSWORD" \
  --set=test_runtime_password="$FRAGMENTS_TEST_RUNTIME_PASSWORD" \
  --set=test_backup_password="$FRAGMENTS_TEST_BACKUP_PASSWORD" \
  --set=restore_password="$FRAGMENTS_RESTORE_PASSWORD" <<'SQL'
CREATE ROLE fragments_prod_migrator LOGIN PASSWORD :'prod_migrator_password';
CREATE ROLE fragments_prod_runtime LOGIN PASSWORD :'prod_runtime_password';
CREATE ROLE fragments_prod_backup LOGIN PASSWORD :'prod_backup_password';
CREATE ROLE fragments_test_migrator LOGIN PASSWORD :'test_migrator_password';
CREATE ROLE fragments_test_runtime LOGIN PASSWORD :'test_runtime_password';
CREATE ROLE fragments_test_backup LOGIN PASSWORD :'test_backup_password';
CREATE ROLE fragments_restore LOGIN CREATEDB PASSWORD :'restore_password';

CREATE DATABASE fragments_prod OWNER fragments_prod_migrator;
CREATE DATABASE fragments_test OWNER fragments_test_migrator;
GRANT CONNECT ON DATABASE fragments_prod TO fragments_prod_runtime;
GRANT CONNECT ON DATABASE fragments_prod TO fragments_prod_backup;
GRANT CONNECT ON DATABASE fragments_test TO fragments_test_runtime;
GRANT CONNECT ON DATABASE fragments_test TO fragments_test_backup;
REVOKE ALL ON DATABASE fragments_prod FROM PUBLIC;
REVOKE ALL ON DATABASE fragments_test FROM PUBLIC;
GRANT CONNECT ON DATABASE fragments_prod TO fragments_prod_migrator, fragments_prod_runtime, fragments_prod_backup;
GRANT CONNECT ON DATABASE fragments_test TO fragments_test_migrator, fragments_test_runtime, fragments_test_backup;

\connect fragments_prod
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO fragments_prod_migrator;
GRANT USAGE ON SCHEMA public TO fragments_prod_runtime;
GRANT USAGE ON SCHEMA public TO fragments_prod_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE fragments_prod_migrator IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO fragments_prod_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE fragments_prod_migrator IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO fragments_prod_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE fragments_prod_migrator IN SCHEMA public GRANT SELECT ON TABLES TO fragments_prod_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE fragments_prod_migrator IN SCHEMA public GRANT SELECT ON SEQUENCES TO fragments_prod_backup;

\connect fragments_test
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO fragments_test_migrator;
GRANT USAGE ON SCHEMA public TO fragments_test_runtime;
GRANT USAGE ON SCHEMA public TO fragments_test_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE fragments_test_migrator IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO fragments_test_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE fragments_test_migrator IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO fragments_test_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE fragments_test_migrator IN SCHEMA public GRANT SELECT ON TABLES TO fragments_test_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE fragments_test_migrator IN SCHEMA public GRANT SELECT ON SEQUENCES TO fragments_test_backup;
SQL
