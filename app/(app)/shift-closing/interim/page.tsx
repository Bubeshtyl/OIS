import { formatInTimeZone } from "date-fns-tz";
import { PageHeader } from "@/components/shared/page-blocks";
import { ShiftClosingCalculator } from "@/components/shift-closing/interim-calculator";
import { requireTenantSession } from "@/lib/auth/permissions";
import { getStationLayout } from "@/lib/station-config/service";
import { getSixAmStatus } from "@/lib/shift-closing/service";
import { getStaffMembers } from "@/lib/actions/staff";
import { IST_TIMEZONE } from "@/lib/timezone";

export const dynamic = "force-dynamic";

export default async function InterimShiftClosingPage() {
  const session = await requireTenantSession();
  const todayIst = formatInTimeZone(new Date(), IST_TIMEZONE, "yyyy-MM-dd");

  const [layout, sixAmStatus, staff] = await Promise.all([
    getStationLayout(session.tenantId),
    getSixAmStatus(session.tenantId, todayIst),
    getStaffMembers(),
  ]);

  const activeStaff = staff
    .filter((member) => member.isActive)
    .map((member) => ({ id: member.id, name: member.name }));

  return (
    <div className="space-y-6">
      <PageHeader title="Interim Shift Closing" />
      <ShiftClosingCalculator
        configuredPumps={layout.pumps}
        sixAmStatus={sixAmStatus}
        staffMembers={activeStaff}
      />
    </div>
  );
}
