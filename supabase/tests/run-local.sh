#!/usr/bin/env bash
# Aplica las migraciones a una base de datos PostgreSQL local desechable (con
# una imitación mínima de auth/storage de Supabase) y ejecuta los tests de RLS.
#
#   PGURL=postgresql://postgres:postgres@localhost:5432 npm run test:rls
#
# Con Supabase CLI + Docker puedes usar en su lugar: supabase db reset && psql ... -f supabase/tests/rls_test.sql
set -euo pipefail
cd "$(dirname "$0")/../.."
PGURL="${PGURL:-postgresql://postgres:postgres@localhost:5432}"
DB="${KORRIGE_TEST_DB:-korrige_test}"
psql "$PGURL/postgres" -q -v ON_ERROR_STOP=1 -c "drop database if exists $DB" -c "create database $DB"
P=(psql "$PGURL/$DB" -q -v ON_ERROR_STOP=1)
"${P[@]}" -c "create extension if not exists pgcrypto" -f supabase/tests/local_stubs.sql
for f in supabase/migrations/*.sql; do
  echo "→ $f"
  "${P[@]}" -f "$f"
done
echo "→ tests RLS"
"${P[@]}" -o /dev/null -f supabase/tests/rls_test.sql 2>&1 | sed -e "s/^psql:[^ ]* NOTICE:  //"
echo "TESTS RLS: TODO OK"
