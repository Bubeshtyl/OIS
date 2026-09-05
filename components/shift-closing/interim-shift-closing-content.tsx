import { formatInTimeZone } from "date-fns-tz";
import { ShiftClosingCalculator } from "@/components/shift-closing/interim-calculator";
import { requireTenantSession } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-permission";
import { getDailyRsp } from "@/lib/shift-closing/service";
import { getStationLayout } from "@/lib/station-config/service";
import { listStaff } from "@/lib/staff/service";
import { IST_TIMEZONE } from "@/lib/timezone";

export async function InterimShiftClosingContent() {
  const session = await requireTenantSession();
  await requirePermission(session, "shift-closing:read");
  const todayIst = formatInTimeZone(new Date(), IST_TIMEZONE, "yyyy-MM-dd");

  const [layout, dailyRsp, staff] = await Promise.all([
    getStationLayout(session.tenantId),
    getDailyRsp(session.tenantId, todayIst),
    listStaff(session.tenantId),
  ]);

  const activeStaff = staff
    .filter((member) => member.isActive)
    .map((member) => ({ id: member.id, name: member.name }));

  const rspPrices =
    dailyRsp?.hsdPrice && dailyRsp?.msPrice && dailyRsp?.speedPrice
      ? {
          hsd: dailyRsp.hsdPrice,
          ms: dailyRsp.msPrice,
          speed: dailyRsp.speedPrice,
        }
      : null;

  return (
    <ShiftClosingCalculator
      configuredPumps={layout.pumps}
      rspPrices={rspPrices}
      staffMembers={activeStaff}
    />
  );
}
