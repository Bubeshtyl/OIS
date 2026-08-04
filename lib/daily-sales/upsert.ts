import { sql } from "drizzle-orm";
import {
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { getDb } from "@/lib/db";
import type { DailySalesRow } from "@/lib/daily-sales/parse-workbook";

/** Larger chunks cut round-trips on remote Postgres (param limit is ~65k). */
const STAGE_CHUNK_SIZE = 2500;

/** Matches the TEMP stage table created inside the upsert transaction. */
const dailySalesStage = pgTable("daily_sales_stage", {
  tenantId: uuid("tenant_id").notNull(),
  receiptNo: text("receipt_no").notNull(),
  startDate: timestamp("start_date", { withTimezone: false }).notNull(),
  endDate: timestamp("end_date", { withTimezone: false }).notNull(),
  product: text("product").notNull(),
  amount: numeric("amount", { precision: 14, scale: 3 }).notNull(),
  volumeLitre: numeric("volume_litre", { precision: 14, scale: 3 }).notNull(),
  ratePerLtr: numeric("rate_per_ltr", { precision: 14, scale: 3 }).notNull(),
  mopType: text("mop_type").notNull(),
  dsmName: text("dsm_name").notNull(),
  bayNo: integer("bay_no"),
  nozzleNo: integer("nozzle_no"),
  startTot: numeric("start_tot", { precision: 16, scale: 3 }).notNull(),
  endTot: numeric("end_tot", { precision: 16, scale: 3 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 14, scale: 3 }).notNull(),
  netAmount: numeric("net_amount", { precision: 14, scale: 3 }).notNull(),
  vehicleNo: text("vehicle_no"),
  vehicleSegment: text("vehicle_segment"),
  mobileNo: text("mobile_no"),
});

export type UpsertDailySalesResult = {
  inserted: number;
  updated: number;
  total: number;
};

function toInsertValues(tenantId: string, row: DailySalesRow) {
  return {
    tenantId,
    receiptNo: row.receiptNo,
    startDate: row.startDate,
    endDate: row.endDate,
    product: row.product,
    amount: row.amount,
    volumeLitre: row.volumeLitre,
    ratePerLtr: row.ratePerLtr,
    mopType: row.mopType,
    dsmName: row.dsmName,
    bayNo: row.bayNo,
    nozzleNo: row.nozzleNo,
    startTot: row.startTot,
    endTot: row.endTot,
    discountAmount: row.discountAmount,
    netAmount: row.netAmount,
    vehicleNo: row.vehicleNo,
    vehicleSegment: row.vehicleSegment,
    mobileNo: row.mobileNo,
  };
}

/**
 * Stage rows in a temp table, then one INSERT…SELECT upsert into daily_sales.
 * Keeps loaded_at on insert only; sets updated_at only on conflict updates.
 */
export async function upsertDailySales(
  tenantId: string,
  rows: DailySalesRow[]
): Promise<UpsertDailySalesResult> {
  if (rows.length === 0) {
    return { inserted: 0, updated: 0, total: 0 };
  }

  const db = getDb();

  return db.transaction(async (tx) => {
    await tx.execute(sql`
      CREATE TEMP TABLE daily_sales_stage (
        tenant_id uuid NOT NULL,
        receipt_no text NOT NULL,
        start_date timestamp NOT NULL,
        end_date timestamp NOT NULL,
        product text NOT NULL,
        amount numeric(14, 3) NOT NULL,
        volume_litre numeric(14, 3) NOT NULL,
        rate_per_ltr numeric(14, 3) NOT NULL,
        mop_type text NOT NULL,
        dsm_name text NOT NULL,
        bay_no integer,
        nozzle_no integer,
        start_tot numeric(16, 3) NOT NULL,
        end_tot numeric(16, 3) NOT NULL,
        discount_amount numeric(14, 3) NOT NULL,
        net_amount numeric(14, 3) NOT NULL,
        vehicle_no text,
        vehicle_segment text,
        mobile_no text,
        PRIMARY KEY (tenant_id, receipt_no)
      ) ON COMMIT DROP
    `);

    for (let i = 0; i < rows.length; i += STAGE_CHUNK_SIZE) {
      const chunk = rows
        .slice(i, i + STAGE_CHUNK_SIZE)
        .map((row) => toInsertValues(tenantId, row));
      await tx.insert(dailySalesStage).values(chunk);
    }

    const countResult = await tx.execute(sql`
      SELECT count(*)::int AS updated
      FROM daily_sales_stage s
      INNER JOIN daily_sales d
        ON d.tenant_id = s.tenant_id AND d.receipt_no = s.receipt_no
    `);
    const updated = Number(
      (countResult[0] as { updated?: number | string } | undefined)?.updated ?? 0
    );
    const inserted = rows.length - updated;

    await tx.execute(sql`
      INSERT INTO daily_sales (
        tenant_id,
        receipt_no,
        start_date,
        end_date,
        product,
        amount,
        volume_litre,
        rate_per_ltr,
        mop_type,
        dsm_name,
        bay_no,
        nozzle_no,
        start_tot,
        end_tot,
        discount_amount,
        net_amount,
        vehicle_no,
        vehicle_segment,
        mobile_no,
        loaded_at,
        updated_at
      )
      SELECT
        s.tenant_id,
        s.receipt_no,
        s.start_date,
        s.end_date,
        s.product,
        s.amount,
        s.volume_litre,
        s.rate_per_ltr,
        s.mop_type,
        s.dsm_name,
        s.bay_no,
        s.nozzle_no,
        s.start_tot,
        s.end_tot,
        s.discount_amount,
        s.net_amount,
        s.vehicle_no,
        s.vehicle_segment,
        s.mobile_no,
        now(),
        NULL
      FROM daily_sales_stage s
      ON CONFLICT (tenant_id, receipt_no) DO UPDATE SET
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        product = EXCLUDED.product,
        amount = EXCLUDED.amount,
        volume_litre = EXCLUDED.volume_litre,
        rate_per_ltr = EXCLUDED.rate_per_ltr,
        mop_type = EXCLUDED.mop_type,
        dsm_name = EXCLUDED.dsm_name,
        bay_no = EXCLUDED.bay_no,
        nozzle_no = EXCLUDED.nozzle_no,
        start_tot = EXCLUDED.start_tot,
        end_tot = EXCLUDED.end_tot,
        discount_amount = EXCLUDED.discount_amount,
        net_amount = EXCLUDED.net_amount,
        vehicle_no = EXCLUDED.vehicle_no,
        vehicle_segment = EXCLUDED.vehicle_segment,
        mobile_no = EXCLUDED.mobile_no,
        updated_at = now()
    `);

    return {
      inserted,
      updated,
      total: rows.length,
    };
  });
}
