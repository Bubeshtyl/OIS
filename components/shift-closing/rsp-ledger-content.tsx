import { RspLedger } from "@/components/shift-closing/rsp-ledger";
import {
  isSystemAdminForSession,
  requireTenantSession,
} from "@/lib/auth/permissions";
import {
  getPendingEditRequests,
  listDailyRspPrices,
} from "@/lib/shift-closing/ledger";

export async function RspLedgerContent() {
  const session = await requireTenantSession();
  const isAdmin = await isSystemAdminForSession(session);

  const [rows, pendingRequests, requestHistory] = await Promise.all([
    listDailyRspPrices(session.tenantId),
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
