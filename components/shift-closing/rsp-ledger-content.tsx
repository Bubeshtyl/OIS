import { RspLedger } from "@/components/shift-closing/rsp-ledger";
import {
  isSystemAdminForSession,
  requireTenantSession,
} from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-permission";
import {
  defaultRangeEnd,
  defaultRangeStart,
} from "@/lib/date-range";
import {
  getPendingEditRequests,
  listDailyRspPrices,
} from "@/lib/shift-closing/ledger";
import { getIstTodayString } from "@/lib/timezone";

export async function RspLedgerContent() {
  const session = await requireTenantSession();
  await requirePermission(session, "shift-closing:read");
  const isAdmin = await isSystemAdminForSession(session);

  const today = getIstTodayString();
  const from = defaultRangeStart(today);
  const to = defaultRangeEnd(today);

  const [rows, pendingRequests, requestHistory] = await Promise.all([
    listDailyRspPrices(session.tenantId, { from, to }),
    getPendingEditRequests(session.tenantId, {
      status: "pending",
      entityType: "daily_rsp",
    }),
    getPendingEditRequests(session.tenantId, {
      entityType: "daily_rsp",
      ...(isAdmin
        ? { limit: 30 }
        : { requestedBy: session.userId, limit: 20 }),
    }),
  ]);

  return (
    <RspLedger
      initialRows={rows}
      pendingRequests={pendingRequests}
      requestHistory={requestHistory}
      isAdmin={isAdmin}
      currentUserId={session.userId}
    />
  );
}
