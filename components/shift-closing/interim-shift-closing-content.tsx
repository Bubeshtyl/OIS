import { formatInTimeZone } from "date-fns-tz";
import { ShiftClosingCalculator } from "@/components/shift-closing/interim-calculator";
import { requireTenantSession } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-permission";
import {
  getLatestNozzleClosingReadings,
  getSixAmStatus,
} from "@/lib/shift-closing/service";
import { getStationLayout } from "@/lib/station-config/service";
import { listActiveStaffOptions } from "@/lib/staff/service";
import { IST_TIMEZONE } from "@/lib/timezone";

export async function InterimShiftClosingContent() {
  const session = await requireTenantSession();
  await requirePermission(session, "shift-closing:read");
  const todayIst = formatInTimeZone(new Date(), IST_TIMEZONE, "yyyy-MM-dd");

  const [layout, sixAmStatus, staffMembers, previousClosingByNozzleId] =
    await Promise.all([
      getStationLayout(session.tenantId),
      getSixAmStatus(session.tenantId, todayIst),
      listActiveStaffOptions(session.tenantId),
      getLatestNozzleClosingReadings(session.tenantId),
    ]);

  return (
    <div className="min-h-[42rem]">
      <ShiftClosingCalculator
        configuredPumps={layout.pumps}
        sixAmStatus={sixAmStatus}
        staffMembers={staffMembers}
        previousClosingByNozzleId={previousClosingByNozzleId}
      />
    </div>
  );
}
