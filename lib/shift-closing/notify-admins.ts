import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  shiftClosingEditRequests,
  users,
  type ShiftClosingEntityType,
} from "@/lib/db/schema";
import { sendPushToUsers } from "@/lib/push/service";
import { listActiveAdminUserIds } from "@/lib/staff/service";

function ledgerUrlForEntityType(entityType: ShiftClosingEntityType): string {
  if (entityType === "daily_rsp") return "/shift-closing/rsp";
  return "/shift-closing/ledger";
}

function entityTypeLabel(entityType: ShiftClosingEntityType): string {
  switch (entityType) {
    case "daily_rsp":
      return "RSP";
    case "machine_slip_entry":
      return "machine slip";
    case "interim_shift_closing":
      return "interim closing";
    default:
      return "ledger entry";
  }
}

export async function notifyAdminsOfLedgerEditRequest(
  tenantId: string,
  requesterUserId: string,
  input: {
    requestId: string;
    entityType: ShiftClosingEntityType;
  }
) {
  const adminIds = await listActiveAdminUserIds(tenantId, requesterUserId);
  if (adminIds.length === 0) return;

  const db = getDb();
  const [requester] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, requesterUserId))
    .limit(1);

  const requesterName = requester?.name ?? "A user";
  const label = entityTypeLabel(input.entityType);
  const url = ledgerUrlForEntityType(input.entityType);

  await sendPushToUsers(tenantId, adminIds, {
    title: "Ledger approval required",
    body: `${requesterName} requested a ${label} edit.`,
    url,
  });
}

export async function notifyAdminsOfLedgerEditRequestById(
  tenantId: string,
  requestId: string
) {
  const db = getDb();
  const [request] = await db
    .select({
      entityType: shiftClosingEditRequests.entityType,
      requestedBy: shiftClosingEditRequests.requestedBy,
    })
    .from(shiftClosingEditRequests)
    .where(eq(shiftClosingEditRequests.id, requestId))
    .limit(1);

  if (!request) return;

  await notifyAdminsOfLedgerEditRequest(tenantId, request.requestedBy, {
    requestId,
    entityType: request.entityType,
  });
}
