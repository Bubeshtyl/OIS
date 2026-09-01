import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

let ensured = false;
let ensuring: Promise<void> | null = null;

/**
 * Idempotent DDL for shift-closing ledger tables/columns.
 * Safe to call on every cold start; runs once per process.
 */
export async function ensureShiftClosingLedgerSchema(): Promise<void> {
  if (ensured) return;
  if (ensuring) return ensuring;

  ensuring = (async () => {
    const db = getDb();

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE shift_closing_entity_type AS ENUM (
          'daily_rsp',
          'machine_slip_entry',
          'interim_shift_closing'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE shift_closing_edit_request_status AS ENUM (
          'pending',
          'approved',
          'rejected',
          'cancelled'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE shift_closing_ledger_event_type AS ENUM (
          'created',
          'edit_requested',
          'edit_approved',
          'edit_rejected'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await db.execute(sql`
      ALTER TABLE daily_rsp_prices
        ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1
    `);

    await db.execute(sql`
      ALTER TABLE machine_slip_entries
        ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1
    `);

    await db.execute(sql`
      ALTER TABLE interim_shift_closings
        ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS shift_closing_edit_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        entity_type shift_closing_entity_type NOT NULL,
        entity_id uuid NOT NULL,
        status shift_closing_edit_request_status NOT NULL DEFAULT 'pending',
        proposed_data jsonb NOT NULL,
        request_note text,
        review_note text,
        requested_by uuid NOT NULL REFERENCES users(id),
        reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
        requested_at timestamptz NOT NULL DEFAULT now(),
        reviewed_at timestamptz
      )
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS shift_closing_edit_requests_tenant_status_idx
        ON shift_closing_edit_requests (tenant_id, status)
    `);

    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS shift_closing_edit_requests_pending_unique
        ON shift_closing_edit_requests (entity_type, entity_id)
        WHERE status = 'pending'
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS shift_closing_ledger_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        entity_type shift_closing_entity_type NOT NULL,
        entity_id uuid NOT NULL,
        event_type shift_closing_ledger_event_type NOT NULL,
        detail text,
        edit_request_id uuid REFERENCES shift_closing_edit_requests(id) ON DELETE SET NULL,
        created_by uuid NOT NULL REFERENCES users(id),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS shift_closing_ledger_events_entity_idx
        ON shift_closing_ledger_events (tenant_id, entity_type, entity_id)
    `);

    ensured = true;
  })();

  return ensuring;
}
