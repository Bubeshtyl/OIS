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

  const isAdmin = await isSystemAdminRole(session.roleId);

  const [slipRows, interimRows, pendingRequests, requestHistory] =
    await Promise.all([
      listMachineSlipEntriesRange(session.tenantId),
      listInterimShiftClosings(session.tenantId),
      getPendingEditRequests(session.tenantId, {
        status: "pending",
        entityTypes: ["machine_slip_entry", "interim_shift_closing"],
      }),
      getPendingEditRequests(session.tenantId, {
        entityTypes: ["machine_slip_entry", "interim_shift_closing"],
        ...(isAdmin
          ? { limit: 30 }
          : { requestedBy: session.userId, limit: 20 }),
      }),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Shift Closing Ledger" />
      <ShiftClosingLedger
        slipRows={slipRows}
        interimRows={interimRows}
        pendingRequests={pendingRequests}
        requestHistory={requestHistory}
        isAdmin={isAdmin}
        currentUserId={session.userId}
      />
    </div>
  );
}
