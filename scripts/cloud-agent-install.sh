#!/usr/bin/env bash
# Idempotent Cloud Agent install: provisions a local PostgreSQL, installs Node
# dependencies, writes a dev .env.local, and pushes/migrates/seeds the schema.
set -euo pipefail

cd "$(dirname "$0")/.."

PG_VERSION=16
DB_NAME=ois
DB_USER=ois
DB_PASSWORD=ois_dev_password
DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5432/${DB_NAME}"

echo "==> Ensuring PostgreSQL is installed"
if ! command -v pg_ctlcluster >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo apt-get install -y postgresql postgresql-contrib
fi

echo "==> Starting PostgreSQL cluster"
sudo pg_ctlcluster "$PG_VERSION" main start 2>/dev/null || true
# Wait for the server to accept connections.
for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -q; then break; fi
  sleep 1
done

echo "==> Ensuring role and database exist"
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;
SQL
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"
fi
sudo -u postgres psql -d "${DB_NAME}" -c "GRANT ALL ON SCHEMA public TO ${DB_USER};"

echo "==> Writing .env.local (dev only) if missing"
if [ ! -f .env.local ]; then
  cat > .env.local <<ENV
DATABASE_URL=${DB_URL}
DATABASE_MIGRATIONS_URL=${DB_URL}
SESSION_SECRET=local-dev-session-secret-change-me-please-32chars
FEATURE_RBAC_ACCESS_UI=true
ENV
fi

echo "==> Installing Node dependencies"
npm install

echo "==> Pushing Drizzle schema"
npx drizzle-kit push --force

echo "==> Applying migrations"
npm run db:migrate

echo "==> Creating demo station (idempotent)"
npx tsx scripts/dev-create-station.ts

echo "==> Seeding sample products (idempotent)"
npm run db:seed

echo "==> Install complete"
