import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-blocks";
import { RspLedger } from "@/components/shift-closing/rsp-ledger";
import {
  isSystemAdminRole,
  requireTenantSession,
} from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/rbac";
import {
  getPendingEditRequests,
  listDailyRspPrices,
} from "@/lib/shift-closing/ledger";

export const dynamic = "force-dynamic";

export default async function RspLedgerPage() {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "shift-closing:read"))) {
    redirect("/");
  }

  const isAdmin = await isSystemAdminRole(session.roleId);

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
    <div className="space-y-6">
      <PageHeader title="RSP Ledger" />
      <RspLedger
        initialRows={rows}
        pendingRequests={pendingRequests}
        requestHistory={requestHistory}
        isAdmin={isAdmin}
        currentUserId={session.userId}
      />
    </div>
  );
}
