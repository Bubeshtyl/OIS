import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/lib/db";
import {
  dailyRspPrices,
  interimNozzleReadings,
  interimPaymentCollections,
  interimShiftClosings,
  machineSlipEntries,
  shiftClosingEditRequests,
  shiftClosingLedgerEvents,
  users,
  type ShiftClosingEntityType,
} from "@/lib/db/schema";
import type {
  DailyRspProposedData,
  EditRequestListItem,
  InterimShiftClosingDetail,
  InterimShiftClosingProposedData,
  MachineSlipProposedData,
  ShiftClosingProposedData,
} from "@/lib/shift-closing/types";
import { interimDetailToProposed } from "@/lib/shift-closing/types";
import {
  notifyAdminsOfLedgerEditRequest,
  notifyRequesterOfEditRequestOutcome,
} from "@/lib/shift-closing/notify-admins";

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type DbClient = Db | Tx;

async function recordLedgerEvent(
  dbOrTx: DbClient,
  data: {
    tenantId: string;
    entityType: ShiftClosingEntityType;
    entityId: string;
    eventType: "created" | "edit_requested" | "edit_approved" | "edit_rejected";
    createdBy: string;
    detail?: string;
    editRequestId?: string;
  }
) {
  await dbOrTx.insert(shiftClosingLedgerEvents).values({
    tenantId: data.tenantId,
    entityType: data.entityType,
    entityId: data.entityId,
    eventType: data.eventType,
    detail: data.detail ?? null,
    editRequestId: data.editRequestId ?? null,
    createdBy: data.createdBy,
  });
}

export async function logShiftClosingCreated(
  tenantId: string,
  userId: string,
  entityType: ShiftClosingEntityType,
  entityId: string,
  detail?: string
) {
  const db = getDb();
  await recordLedgerEvent(db, {
    tenantId,
    entityType,
    entityId,
    eventType: "created",
    createdBy: userId,
    detail,
  });
}

export async function listDailyRspPrices(
  tenantId: string,
  filters: { from?: string; to?: string } = {}
) {
  const db = getDb();
  const conditions = [eq(dailyRspPrices.tenantId, tenantId)];
  if (filters.from) {
    conditions.push(gte(dailyRspPrices.priceDate, filters.from));
  }
  if (filters.to) {
    conditions.push(lte(dailyRspPrices.priceDate, filters.to));
  }

  const rows = await db
    .select({
      id: dailyRspPrices.id,
      priceDate: dailyRspPrices.priceDate,
      hsdPrice: dailyRspPrices.hsdPrice,
      msPrice: dailyRspPrices.msPrice,
      speedPrice: dailyRspPrices.speedPrice,
      revision: dailyRspPrices.revision,
      recordedBy: dailyRspPrices.recordedBy,
      recorderName: users.name,
      createdAt: dailyRspPrices.createdAt,
      updatedAt: dailyRspPrices.updatedAt,
    })
    .from(dailyRspPrices)
    .leftJoin(users, eq(dailyRspPrices.recordedBy, users.id))
    .where(and(...conditions))
    .orderBy(desc(dailyRspPrices.priceDate));

  return rows;
}

export async function listMachineSlipEntriesRange(
  tenantId: string,
  filters: { from?: string; to?: string; machineNumber?: string } = {}
) {
  const db = getDb();
  const conditions = [eq(machineSlipEntries.tenantId, tenantId)];
  if (filters.from) {
    conditions.push(gte(machineSlipEntries.entryDate, filters.from));
  }
  if (filters.to) {
    conditions.push(lte(machineSlipEntries.entryDate, filters.to));
  }
  if (filters.machineNumber) {
    conditions.push(eq(machineSlipEntries.machineNumber, filters.machineNumber));
  }

  const rows = await db
    .select({
      id: machineSlipEntries.id,
      entryDate: machineSlipEntries.entryDate,
      machineNumber: machineSlipEntries.machineNumber,
      nozzleNumber: machineSlipEntries.nozzleNumber,
      reading: machineSlipEntries.reading,
      revision: machineSlipEntries.revision,
      recordedBy: machineSlipEntries.recordedBy,
      recorderName: users.name,
      createdAt: machineSlipEntries.createdAt,
      updatedAt: machineSlipEntries.updatedAt,
    })
    .from(machineSlipEntries)
    .leftJoin(users, eq(machineSlipEntries.recordedBy, users.id))
    .where(and(...conditions))
    .orderBy(
      desc(machineSlipEntries.entryDate),
      machineSlipEntries.machineNumber,
      machineSlipEntries.nozzleNumber
    );

  return rows;
}

export async function listInterimShiftClosings(
  tenantId: string,
  filters: { from?: string; to?: string; pumpNumber?: number } = {}
) {
  const db = getDb();
  const conditions = [eq(interimShiftClosings.tenantId, tenantId)];
  if (filters.from) {
    conditions.push(
      gte(
        sql`date(${interimShiftClosings.shiftDate} AT TIME ZONE 'Asia/Kolkata')`,
        filters.from
      )
    );
  }
  if (filters.to) {
    conditions.push(
      lte(
        sql`date(${interimShiftClosings.shiftDate} AT TIME ZONE 'Asia/Kolkata')`,
        filters.to
      )
    );
  }
  if (filters.pumpNumber != null) {
    conditions.push(eq(interimShiftClosings.pumpNumber, filters.pumpNumber));
  }

  const staffUser = alias(users, "interim_staff");
  const creatorUser = alias(users, "interim_creator");

  const rows = await db
    .select({
      id: interimShiftClosings.id,
      pumpNumber: interimShiftClosings.pumpNumber,
      pumpName: interimShiftClosings.pumpName,
      shiftDate: interimShiftClosings.shiftDate,
      totalSalesAmount: interimShiftClosings.totalSalesAmount,
      totalCollected: interimShiftClosings.totalCollected,
      difference: interimShiftClosings.difference,
      revision: interimShiftClosings.revision,
      staffName: staffUser.name,
      createdByName: creatorUser.name,
      createdAt: interimShiftClosings.createdAt,
    })
    .from(interimShiftClosings)
    .leftJoin(staffUser, eq(interimShiftClosings.staffId, staffUser.id))
    .leftJoin(creatorUser, eq(interimShiftClosings.createdBy, creatorUser.id))
    .where(and(...conditions))
    .orderBy(desc(interimShiftClosings.shiftDate));

  return rows;
}

export async function getInterimShiftClosingById(
  tenantId: string,
  id: string
): Promise<InterimShiftClosingDetail | null> {
  const db = getDb();
  const staffUser = alias(users, "detail_staff");
  const creatorUser = alias(users, "detail_creator");

  const [closing] = await db
    .select({
      id: interimShiftClosings.id,
      pumpNumber: interimShiftClosings.pumpNumber,
      pumpName: interimShiftClosings.pumpName,
      staffId: interimShiftClosings.staffId,
      staffName: staffUser.name,
      shiftDate: interimShiftClosings.shiftDate,
      totalGross: interimShiftClosings.totalGross,
      totalTest: interimShiftClosings.totalTest,
      totalNetLitres: interimShiftClosings.totalNetLitres,
      totalSalesAmount: interimShiftClosings.totalSalesAmount,
      totalCollected: interimShiftClosings.totalCollected,
      difference: interimShiftClosings.difference,
      revision: interimShiftClosings.revision,
      createdAt: interimShiftClosings.createdAt,
      createdByName: creatorUser.name,
    })
    .from(interimShiftClosings)
    .leftJoin(staffUser, eq(interimShiftClosings.staffId, staffUser.id))
    .leftJoin(creatorUser, eq(interimShiftClosings.createdBy, creatorUser.id))
    .where(
      and(
        eq(interimShiftClosings.tenantId, tenantId),
        eq(interimShiftClosings.id, id)
      )
    )
    .limit(1);

  if (!closing) return null;

  const [nozzles, payment] = await Promise.all([
    db
      .select()
      .from(interimNozzleReadings)
      .where(eq(interimNozzleReadings.shiftClosingId, id)),
    db
      .select()
      .from(interimPaymentCollections)
      .where(eq(interimPaymentCollections.shiftClosingId, id))
      .limit(1),
  ]);

  return {
    ...closing,
    nozzleReadings: nozzles.map((n) => ({
      id: n.id,
      nozzleId: n.nozzleId,
      nozzleName: n.nozzleName,
      openingReading: n.openingReading,
      closingReading: n.closingReading,
      testVolume: n.testVolume,
      netVolume: n.netVolume,
      ratePerLitre: n.ratePerLitre,
      salesAmount: n.salesAmount,
    })),
    paymentCollection: payment[0]
      ? {
          cashAmount: payment[0].cashAmount,
          cashDenominations: payment[0].cashDenominations as Record<
            string,
            unknown
          > | null,
          pinelabsCard: payment[0].pinelabsCard,
          pinelabsUpi: payment[0].pinelabsUpi,
          pinelabsAlp: payment[0].pinelabsAlp,
          pos: payment[0].pos,
          qr: payment[0].qr,
          ufill: payment[0].ufill,
          bill: payment[0].bill,
          expenses: payment[0].expenses,
          totalCollected: payment[0].totalCollected,
        }
      : null,
  };
}

async function getEntityCurrentData(
  tenantId: string,
  entityType: ShiftClosingEntityType,
  entityId: string
): Promise<ShiftClosingProposedData | Record<string, unknown> | null> {
  const db = getDb();

  if (entityType === "daily_rsp") {
    const [row] = await db
      .select()
      .from(dailyRspPrices)
      .where(
        and(
          eq(dailyRspPrices.tenantId, tenantId),
          eq(dailyRspPrices.id, entityId)
        )
      )
      .limit(1);
    if (!row) return null;
    return {
      priceDate: row.priceDate,
      hsdPrice: row.hsdPrice,
      msPrice: row.msPrice,
      speedPrice: row.speedPrice,
    } satisfies DailyRspProposedData;
  }

  if (entityType === "machine_slip_entry") {
    const [row] = await db
      .select()
      .from(machineSlipEntries)
      .where(
        and(
          eq(machineSlipEntries.tenantId, tenantId),
          eq(machineSlipEntries.id, entityId)
        )
      )
      .limit(1);
    if (!row) return null;
    return {
      entryDate: row.entryDate,
      machineNumber: row.machineNumber,
      nozzleNumber: row.nozzleNumber,
      reading: row.reading,
    } satisfies MachineSlipProposedData;
  }

  const detail = await getInterimShiftClosingById(tenantId, entityId);
  if (!detail) return null;
  return interimDetailToProposed(detail);
}

function entityLabel(
  entityType: ShiftClosingEntityType,
  current: ShiftClosingProposedData | Record<string, unknown> | null
): string {
  if (!current) return entityType;
  if (entityType === "daily_rsp") {
    const d = current as DailyRspProposedData;
    return `RSP ${d.priceDate}`;
  }
  if (entityType === "machine_slip_entry") {
    const d = current as MachineSlipProposedData;
    return `Slip ${d.entryDate} · ${d.machineNumber} · N${d.nozzleNumber}`;
  }
  const d = current as InterimShiftClosingProposedData;
  return `Interim · ${d.pumpName} · Pump ${d.pumpNumber}`;
}

export type ShiftClosingPendingBadgeCounts = {
  rsp: number;
  ledger: number;
};

export async function countPendingEditRequests(
  tenantId: string
): Promise<ShiftClosingPendingBadgeCounts> {
  const db = getDb();

  const [row] = await db
    .select({
      rsp: sql<number>`count(*) filter (where ${shiftClosingEditRequests.entityType} = 'daily_rsp')::int`,
      ledger: sql<number>`count(*) filter (where ${shiftClosingEditRequests.entityType} in ('machine_slip_entry', 'interim_shift_closing'))::int`,
    })
    .from(shiftClosingEditRequests)
    .where(
      and(
        eq(shiftClosingEditRequests.tenantId, tenantId),
        eq(shiftClosingEditRequests.status, "pending")
      )
    );

  return {
    rsp: Number(row?.rsp ?? 0),
    ledger: Number(row?.ledger ?? 0),
  };
}

async function mapEditRequestRow(
  tenantId: string,
  row: typeof shiftClosingEditRequests.$inferSelect,
  requesterName: string | null,
  reviewerName: string | null
): Promise<EditRequestListItem> {
  const currentData = await getEntityCurrentData(
    tenantId,
    row.entityType,
    row.entityId
  );

  return {
    id: row.id,
    entityType: row.entityType,
    entityId: row.entityId,
    status: row.status,
    requestNote: row.requestNote,
    reviewNote: row.reviewNote,
    requestedAt: row.requestedAt,
    reviewedAt: row.reviewedAt,
    requestedByUserId: row.requestedBy,
    requestedByName: requesterName,
    reviewedByName: reviewerName,
    proposedData: row.proposedData as ShiftClosingProposedData,
    currentData,
    entityLabel: entityLabel(row.entityType, currentData),
  };
}

export async function getPendingEditRequests(
  tenantId: string,
  filters: {
    status?: "pending" | "approved" | "rejected" | "cancelled";
    entityType?: ShiftClosingEntityType;
    entityTypes?: ShiftClosingEntityType[];
    requestedBy?: string;
    limit?: number;
  } = {}
) {
  const db = getDb();
  const conditions = [eq(shiftClosingEditRequests.tenantId, tenantId)];
  if (filters.status) {
    conditions.push(eq(shiftClosingEditRequests.status, filters.status));
  }
  if (filters.entityType) {
    conditions.push(eq(shiftClosingEditRequests.entityType, filters.entityType));
  }
  if (filters.entityTypes?.length) {
    conditions.push(
      inArray(shiftClosingEditRequests.entityType, filters.entityTypes)
    );
  }
  if (filters.requestedBy) {
    conditions.push(eq(shiftClosingEditRequests.requestedBy, filters.requestedBy));
  }

  const requesterUser = alias(users, "edit_requester");
  const reviewerUser = alias(users, "edit_reviewer");

  let query = db
    .select({
      request: shiftClosingEditRequests,
      requesterName: requesterUser.name,
      reviewerName: reviewerUser.name,
    })
    .from(shiftClosingEditRequests)
    .leftJoin(
      requesterUser,
      eq(shiftClosingEditRequests.requestedBy, requesterUser.id)
    )
    .leftJoin(
      reviewerUser,
      eq(shiftClosingEditRequests.reviewedBy, reviewerUser.id)
    )
    .where(and(...conditions))
    .orderBy(desc(shiftClosingEditRequests.requestedAt));

  if (filters.limit) {
    query = query.limit(filters.limit) as typeof query;
  }

  const rows = await query;

  return Promise.all(
    rows.map((r) =>
      mapEditRequestRow(
        tenantId,
        r.request,
        r.requesterName,
        r.reviewerName
      )
    )
  );
}

export async function getEditRequestById(tenantId: string, requestId: string) {
  const db = getDb();
  const requesterUser = alias(users, "edit_requester_detail");
  const reviewerUser = alias(users, "edit_reviewer_detail");

  const [row] = await db
    .select({
      request: shiftClosingEditRequests,
      requesterName: requesterUser.name,
      reviewerName: reviewerUser.name,
    })
    .from(shiftClosingEditRequests)
    .leftJoin(
      requesterUser,
      eq(shiftClosingEditRequests.requestedBy, requesterUser.id)
    )
    .leftJoin(
      reviewerUser,
      eq(shiftClosingEditRequests.reviewedBy, reviewerUser.id)
    )
    .where(
      and(
        eq(shiftClosingEditRequests.tenantId, tenantId),
        eq(shiftClosingEditRequests.id, requestId)
      )
    )
    .limit(1);

  if (!row) return null;
  return mapEditRequestRow(
    tenantId,
    row.request,
    row.requesterName,
    row.reviewerName
  );
}

async function applyApprovedEdit(
  tx: Tx,
  tenantId: string,
  adminUserId: string,
  entityType: ShiftClosingEntityType,
  entityId: string,
  proposedData: ShiftClosingProposedData
) {
  if (entityType === "daily_rsp") {
    const data = proposedData as DailyRspProposedData;
    await tx
      .update(dailyRspPrices)
      .set({
        hsdPrice: data.hsdPrice,
        msPrice: data.msPrice,
        speedPrice: data.speedPrice,
        recordedBy: adminUserId,
        updatedAt: new Date(),
        revision: sql`${dailyRspPrices.revision} + 1`,
      })
      .where(
        and(
          eq(dailyRspPrices.tenantId, tenantId),
          eq(dailyRspPrices.id, entityId)
        )
      );
    return;
  }

  if (entityType === "machine_slip_entry") {
    const data = proposedData as MachineSlipProposedData;
    await tx
      .update(machineSlipEntries)
      .set({
        reading: data.reading,
        recordedBy: adminUserId,
        updatedAt: new Date(),
        revision: sql`${machineSlipEntries.revision} + 1`,
      })
      .where(
        and(
          eq(machineSlipEntries.tenantId, tenantId),
          eq(machineSlipEntries.id, entityId)
        )
      );
    return;
  }

  const data = proposedData as InterimShiftClosingProposedData;
  await tx
    .update(interimShiftClosings)
    .set({
      pumpNumber: data.pumpNumber,
      pumpName: data.pumpName,
      staffId: data.staffId,
      shiftDate: data.shiftDate ? new Date(data.shiftDate) : new Date(),
      totalGross: String(data.totalGross),
      totalTest: String(data.totalTest),
      totalNetLitres: String(data.totalNetLitres),
      totalSalesAmount: String(data.totalSalesAmount),
      totalCollected: String(data.totalCollected),
      difference: String(data.difference),
      paymentCollections: data.paymentBreakdown
        ? (data.paymentBreakdown as unknown as Record<string, unknown>)
        : null,
      revision: sql`${interimShiftClosings.revision} + 1`,
    })
    .where(
      and(
        eq(interimShiftClosings.tenantId, tenantId),
        eq(interimShiftClosings.id, entityId)
      )
    );

  await tx
    .delete(interimNozzleReadings)
    .where(eq(interimNozzleReadings.shiftClosingId, entityId));
  await tx
    .delete(interimPaymentCollections)
    .where(eq(interimPaymentCollections.shiftClosingId, entityId));

  if (data.nozzleReadings.length > 0) {
    await tx.insert(interimNozzleReadings).values(
      data.nozzleReadings.map((nozzle) => ({
        shiftClosingId: entityId,
        nozzleId: nozzle.nozzleId || null,
        nozzleName: nozzle.nozzleName,
        openingReading: String(nozzle.openingReading),
        closingReading: String(nozzle.closingReading),
        testVolume: String(nozzle.testVolume),
        netVolume: String(nozzle.netVolume),
        ratePerLitre:
          nozzle.ratePerLitre != null ? String(nozzle.ratePerLitre) : null,
        salesAmount:
          nozzle.salesAmount != null ? String(nozzle.salesAmount) : null,
      }))
    );
  }

  if (data.paymentBreakdown) {
    const p = data.paymentBreakdown;
    await tx.insert(interimPaymentCollections).values({
      shiftClosingId: entityId,
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
}

export async function createEditRequest(
  tenantId: string,
  userId: string,
  input: {
    entityType: ShiftClosingEntityType;
    entityId: string;
    proposedData: ShiftClosingProposedData;
    note?: string;
  }
) {
  const db = getDb();
  const current = await getEntityCurrentData(
    tenantId,
    input.entityType,
    input.entityId
  );
  if (!current) {
    throw new Error("Ledger entry not found.");
  }

  const [pending] = await db
    .select({ id: shiftClosingEditRequests.id })
    .from(shiftClosingEditRequests)
    .where(
      and(
        eq(shiftClosingEditRequests.tenantId, tenantId),
        eq(shiftClosingEditRequests.entityType, input.entityType),
        eq(shiftClosingEditRequests.entityId, input.entityId),
        eq(shiftClosingEditRequests.status, "pending")
      )
    )
    .limit(1);

  if (pending) {
    throw new Error("A pending edit request already exists for this entry.");
  }

  return db.transaction(async (tx) => {
    const [request] = await tx
      .insert(shiftClosingEditRequests)
      .values({
        tenantId,
        entityType: input.entityType,
        entityId: input.entityId,
        proposedData: input.proposedData as unknown as Record<string, unknown>,
        requestNote: input.note ?? null,
        requestedBy: userId,
      })
      .returning();

    await recordLedgerEvent(tx, {
      tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
      eventType: "edit_requested",
      createdBy: userId,
      editRequestId: request.id,
      detail: input.note ?? "Edit requested",
    });

    void notifyAdminsOfLedgerEditRequest(tenantId, userId, {
      requestId: request.id,
      entityType: input.entityType,
    }).catch((error) => {
      console.error("Failed to send ledger edit push notification:", error);
    });

    return request;
  });
}

export async function approveEditRequest(
  tenantId: string,
  adminUserId: string,
  requestId: string,
  reviewNote?: string
) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(shiftClosingEditRequests)
      .where(
        and(
          eq(shiftClosingEditRequests.tenantId, tenantId),
          eq(shiftClosingEditRequests.id, requestId)
        )
      )
      .limit(1);

    if (!request) throw new Error("Edit request not found.");
    if (request.status !== "pending") {
      throw new Error("This edit request is no longer pending.");
    }
    if (request.requestedBy === adminUserId) {
      throw new Error("You cannot approve your own edit request.");
    }

    await applyApprovedEdit(
      tx,
      tenantId,
      adminUserId,
      request.entityType,
      request.entityId,
      request.proposedData as ShiftClosingProposedData
    );

    const [updated] = await tx
      .update(shiftClosingEditRequests)
      .set({
        status: "approved",
        reviewedBy: adminUserId,
        reviewNote: reviewNote ?? null,
        reviewedAt: new Date(),
      })
      .where(eq(shiftClosingEditRequests.id, requestId))
      .returning();

    await recordLedgerEvent(tx, {
      tenantId,
      entityType: request.entityType,
      entityId: request.entityId,
      eventType: "edit_approved",
      createdBy: adminUserId,
      editRequestId: requestId,
      detail: reviewNote ?? "Edit approved",
    });

    void notifyRequesterOfEditRequestOutcome(
      tenantId,
      request.requestedBy,
      {
        entityType: request.entityType,
        outcome: "approved",
        reviewNote,
      }
    ).catch((error) => {
      console.error("Failed to send edit approval push notification:", error);
    });

    return updated;
  });
}

export async function rejectEditRequest(
  tenantId: string,
  adminUserId: string,
  requestId: string,
  reviewNote?: string
) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(shiftClosingEditRequests)
      .where(
        and(
          eq(shiftClosingEditRequests.tenantId, tenantId),
          eq(shiftClosingEditRequests.id, requestId)
        )
      )
      .limit(1);

    if (!request) throw new Error("Edit request not found.");
    if (request.status !== "pending") {
      throw new Error("This edit request is no longer pending.");
    }
    if (request.requestedBy === adminUserId) {
      throw new Error("You cannot reject your own edit request.");
    }

    const [updated] = await tx
      .update(shiftClosingEditRequests)
      .set({
        status: "rejected",
        reviewedBy: adminUserId,
        reviewNote: reviewNote ?? null,
        reviewedAt: new Date(),
      })
      .where(eq(shiftClosingEditRequests.id, requestId))
      .returning();

    await recordLedgerEvent(tx, {
      tenantId,
      entityType: request.entityType,
      entityId: request.entityId,
      eventType: "edit_rejected",
      createdBy: adminUserId,
      editRequestId: requestId,
      detail: reviewNote ?? "Edit rejected",
    });

    void notifyRequesterOfEditRequestOutcome(
      tenantId,
      request.requestedBy,
      {
        entityType: request.entityType,
        outcome: "rejected",
        reviewNote,
      }
    ).catch((error) => {
      console.error("Failed to send edit rejection push notification:", error);
    });

    return updated;
  });
}

export async function cancelEditRequest(
  tenantId: string,
  userId: string,
  requestId: string
) {
  const db = getDb();
  const [request] = await db
    .select()
    .from(shiftClosingEditRequests)
    .where(
      and(
        eq(shiftClosingEditRequests.tenantId, tenantId),
        eq(shiftClosingEditRequests.id, requestId)
      )
    )
    .limit(1);

  if (!request) throw new Error("Edit request not found.");
  if (request.status !== "pending") {
    throw new Error("Only pending requests can be cancelled.");
  }
  if (request.requestedBy !== userId) {
    throw new Error("You can only cancel your own edit requests.");
  }

  const [updated] = await db
    .update(shiftClosingEditRequests)
    .set({ status: "cancelled", reviewedAt: new Date() })
    .where(eq(shiftClosingEditRequests.id, requestId))
    .returning();

  return updated;
}
