import { PageHeader } from "@/components/shared/page-blocks";
import { ShiftClosingLedger } from "@/components/shift-closing/shift-closing-ledger";
import {
  isSystemAdminForSession,
  requireTenantSession,
} from "@/lib/auth/permissions";
import {
  getPendingEditRequests,
  listInterimShiftClosings,
  listMachineSlipEntriesRange,
} from "@/lib/shift-closing/ledger";


export default async function ShiftClosingLedgerPage() {
  const session = await requireTenantSession();
  const isAdmin = await isSystemAdminForSession(session);

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
