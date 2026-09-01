import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-blocks";
import { ShiftClosingLedger } from "@/components/shift-closing/shift-closing-ledger";
import {
  isSystemAdminRole,
  requireTenantSession,
} from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/rbac";
import {
  getPendingEditRequests,
  listInterimShiftClosings,
  listMachineSlipEntriesRange,
} from "@/lib/shift-closing/ledger";

export const dynamic = "force-dynamic";

export default async function ShiftClosingLedgerPage() {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "shift-closing:read"))) {
    redirect("/");
  }

  const [slipRows, interimRows, pendingRequests, isAdmin] = await Promise.all([
    listMachineSlipEntriesRange(session.tenantId),
    listInterimShiftClosings(session.tenantId),
    getPendingEditRequests(session.tenantId, { status: "pending" }),
    isSystemAdminRole(session.roleId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Shift Closing Ledger" />
      <ShiftClosingLedger
        slipRows={slipRows}
        interimRows={interimRows}
        pendingRequests={pendingRequests}
        isAdmin={isAdmin}
      />
    </div>
  );
}
