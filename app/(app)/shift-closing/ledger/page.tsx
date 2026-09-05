import { PageHeader } from "@/components/shared/page-blocks";
import { ShiftClosingLedger } from "@/components/shift-closing/shift-closing-ledger";
import {
  isSystemAdminForSession,
  requireTenantSession,
} from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-permission";
import {
  defaultRangeEnd,
  defaultRangeStart,
  isValidDateString,
  normalizeDateRange,
} from "@/lib/date-range";
import {
  getPendingEditRequests,
  listInterimShiftClosings,
  listMachineSlipEntriesRange,
} from "@/lib/shift-closing/ledger";
import { getIstTodayString } from "@/lib/timezone";

export default async function ShiftClosingLedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  const session = await requireTenantSession();
  await requirePermission(session, "shift-closing:read");
  const isAdmin = await isSystemAdminForSession(session);

  const params = await searchParams;
  const today = getIstTodayString();
  const defaultStart = defaultRangeStart(today);
  const defaultEnd = defaultRangeEnd(today);
  const { start, end } = normalizeDateRange(
    isValidDateString(params.start) ? params.start : defaultStart,
    isValidDateString(params.end) ? params.end : defaultEnd
  );

  const [slipRows, interimRows, pendingRequests, requestHistory] =
    await Promise.all([
      listMachineSlipEntriesRange(session.tenantId, {
        from: start,
        to: end,
      }),
      listInterimShiftClosings(session.tenantId, { from: start, to: end }),
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
        initialFrom={start}
        initialTo={end}
        defaultStart={defaultStart}
        defaultEnd={defaultEnd}
      />
    </div>
  );
}
