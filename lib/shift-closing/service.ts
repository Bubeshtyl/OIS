import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  dailyRspPrices,
  machineSlipEntries,
  interimShiftClosings,
  interimNozzleReadings,
  interimPaymentCollections,
  shiftClosingLedgerEvents,
  type DailyRspPrice,
  type MachineSlipEntry,
} from "@/lib/db/schema";
import { logShiftClosingCreated } from "@/lib/shift-closing/ledger";
import { EditRequiresApprovalError } from "@/lib/shift-closing/types";

export { EditRequiresApprovalError } from "@/lib/shift-closing/types";

export interface SixAmStatus {
  hasRsp: boolean;
  hasSlipEntry: boolean;
  isReady: boolean;
  dateStr: string;
  rspPrices: {
    hsd: string;
    ms: string;
    speed: string;
  } | null;
  slipEntriesCount: number;
}

export async function getDailyRsp(
  tenantId: string,
  dateStr: string
): Promise<DailyRspPrice | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(dailyRspPrices)
    .where(
      and(
        eq(dailyRspPrices.tenantId, tenantId),
        eq(dailyRspPrices.priceDate, dateStr)
      )
    )
    .limit(1);

  return row || null;
}

export async function saveDailyRsp(
  tenantId: string,
  userId: string,
  data: {
    priceDate: string;
    hsdPrice: string;
    msPrice: string;
    speedPrice: string;
  }
) {
  const db = getDb();
  const existing = await getDailyRsp(tenantId, data.priceDate);
  if (existing) {
    throw new EditRequiresApprovalError(
      `RSP for ${data.priceDate} already exists. Request an edit from the RSP Ledger.`
    );
  }

  const [row] = await db
    .insert(dailyRspPrices)
    .values({
      tenantId,
      priceDate: data.priceDate,
      hsdPrice: data.hsdPrice,
      msPrice: data.msPrice,
      speedPrice: data.speedPrice,
      recordedBy: userId,
      updatedAt: new Date(),
    })
    .returning();

  await logShiftClosingCreated(
    tenantId,
    userId,
    "daily_rsp",
    row.id,
    `RSP recorded for ${data.priceDate}`
  );

  return row;
}

export async function getMachineSlipEntries(
  tenantId: string,
  dateStr: string
): Promise<MachineSlipEntry[]> {
  const db = getDb();
  return db
    .select()
    .from(machineSlipEntries)
    .where(
      and(
        eq(machineSlipEntries.tenantId, tenantId),
        eq(machineSlipEntries.entryDate, dateStr)
      )
    );
}

export interface MachineSlipItem {
  machineNumber: string;
  nozzleNumber: number;
  reading: string;
}

export async function saveMachineSlipEntries(
  tenantId: string,
  userId: string,
  data: {
    entryDate: string;
    entries: MachineSlipItem[];
  }
) {
  const db = getDb();
  if (!data.entries || data.entries.length === 0) return [];

  const results = [];
  for (const entry of data.entries) {
    const [existing] = await db
      .select({ id: machineSlipEntries.id })
      .from(machineSlipEntries)
      .where(
        and(
          eq(machineSlipEntries.tenantId, tenantId),
          eq(machineSlipEntries.entryDate, data.entryDate),
          eq(machineSlipEntries.machineNumber, entry.machineNumber),
          eq(machineSlipEntries.nozzleNumber, entry.nozzleNumber)
        )
      )
      .limit(1);

    if (existing) {
      throw new EditRequiresApprovalError(
        `Slip entry for ${data.entryDate} · ${entry.machineNumber} · Nozzle ${entry.nozzleNumber} already exists. Request an edit from the Ledger.`
      );
    }

    const [row] = await db
      .insert(machineSlipEntries)
      .values({
        tenantId,
        entryDate: data.entryDate,
        machineNumber: entry.machineNumber,
        nozzleNumber: entry.nozzleNumber,
        reading: entry.reading,
        recordedBy: userId,
        updatedAt: new Date(),
      })
      .returning();

    await logShiftClosingCreated(
      tenantId,
      userId,
      "machine_slip_entry",
      row.id,
      `Slip ${data.entryDate} · ${entry.machineNumber} · N${entry.nozzleNumber}`
    );

    results.push(row);
  }

  return results;
}

export async function getSixAmStatus(
  tenantId: string,
  dateStr: string
): Promise<SixAmStatus> {
  const [rspRow, slipEntries] = await Promise.all([
    getDailyRsp(tenantId, dateStr),
    getMachineSlipEntries(tenantId, dateStr),
  ]);

  const hasRsp = !!rspRow && !!rspRow.hsdPrice && !!rspRow.msPrice && !!rspRow.speedPrice;
  const hasSlipEntry = slipEntries.length > 0;
  const isReady = hasRsp && hasSlipEntry;

  return {
    hasRsp,
    hasSlipEntry,
    isReady,
    dateStr,
    rspPrices: rspRow
      ? {
          hsd: rspRow.hsdPrice,
          ms: rspRow.msPrice,
          speed: rspRow.speedPrice,
        }
      : null,
    slipEntriesCount: slipEntries.length,
  };
}

export interface InterimPaymentInput {
  cashAmount: number;
  cashDenominations?: Record<string, unknown> | null;
  pinelabsCard: number;
  pinelabsUpi: number;
  pinelabsAlp: number;
  pos: number;
  qr: number;
  ufill: number;
  bill: number;
  expenses: number;
  totalCollected: number;
}

export interface SaveInterimShiftClosingInput {
  pumpId?: string | null;
  pumpNumber: number;
  pumpName: string;
  staffId: string;
  shiftDate?: Date;
  totalGross: number;
  totalTest: number;
  totalNetLitres: number;
  totalSalesAmount: number;
  totalCollected: number;
  difference: number;
  paymentBreakdown?: InterimPaymentInput | null;
  nozzleReadings: Array<{
    nozzleId?: string | null;
    nozzleName: string;
    openingReading: number;
    closingReading: number;
    testVolume: number;
    netVolume: number;
    ratePerLitre?: number | null;
    salesAmount?: number | null;
  }>;
}

export async function saveInterimShiftClosing(
  tenantId: string,
  userId: string,
  input: SaveInterimShiftClosingInput
) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [shiftClosing] = await tx
      .insert(interimShiftClosings)
      .values({
        tenantId,
        pumpId: input.pumpId || null,
        pumpNumber: input.pumpNumber,
        pumpName: input.pumpName,
        staffId: input.staffId,
        shiftDate: input.shiftDate || new Date(),
        totalGross: String(input.totalGross),
        totalTest: String(input.totalTest),
        totalNetLitres: String(input.totalNetLitres),
        totalSalesAmount: String(input.totalSalesAmount),
        totalCollected: String(input.totalCollected),
        difference: String(input.difference),
        paymentCollections: input.paymentBreakdown ? (input.paymentBreakdown as unknown as Record<string, unknown>) : null,
        createdBy: userId,
      })
      .returning();

    if (input.nozzleReadings && input.nozzleReadings.length > 0) {
      await tx.insert(interimNozzleReadings).values(
        input.nozzleReadings.map((nozzle) => ({
          shiftClosingId: shiftClosing.id,
          nozzleId: nozzle.nozzleId || null,
          nozzleName: nozzle.nozzleName,
          openingReading: String(nozzle.openingReading),
          closingReading: String(nozzle.closingReading),
          testVolume: String(nozzle.testVolume),
          netVolume: String(nozzle.netVolume),
          ratePerLitre: nozzle.ratePerLitre != null ? String(nozzle.ratePerLitre) : null,
          salesAmount: nozzle.salesAmount != null ? String(nozzle.salesAmount) : null,
        }))
      );
    }

    if (input.paymentBreakdown) {
      const p = input.paymentBreakdown;
      await tx.insert(interimPaymentCollections).values({
        shiftClosingId: shiftClosing.id,
        cashAmount: String(p.cashAmount),
        cashDenominations: p.cashDenominations || null,
        pinelabsCard: String(p.pinelabsCard),
        pinelabsUpi: String(p.pinelabsUpi),
        pinelabsAlp: String(p.pinelabsAlp),
        pos: String(p.pos),
        qr: String(p.qr),
        ufill: String(p.ufill),
        bill: String(p.bill),
        expenses: String(p.expenses),
        totalCollected: String(p.totalCollected),
      });
    }

    await tx.insert(shiftClosingLedgerEvents).values({
      tenantId,
      entityType: "interim_shift_closing",
      entityId: shiftClosing.id,
      eventType: "created",
      detail: `Interim close for ${input.pumpName}`,
      createdBy: userId,
    });

    return shiftClosing;
  });
}
