import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { ShiftClosingCalculator } from "@/components/shift-closing/interim-calculator";
import { requireTenantSession } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-permission";
import { parseIstDate, toIstDateString } from "@/lib/date-range";
import {
  getDailyRsp,
  getLatestNozzleClosingReadings,
  getMachineSlipEntries,
  getSixAmStatus,
} from "@/lib/shift-closing/service";
import { getUpcomingPrerequisites } from "@/lib/shift-closing/upcoming-prerequisites";
import {
  getStationLayout,
  type PumpWithNozzles,
} from "@/lib/station-config/service";
import { listStaff } from "@/lib/staff/service";
import { IST_TIMEZONE } from "@/lib/timezone";

function buildSixAmReadingsByNozzleId(
  pumps: PumpWithNozzles[],
  slips: Array<{ machineNumber: string; nozzleNumber: number; reading: string }>
): Record<string, number> {
  const slipMap = new Map<string, number>();
  for (const slip of slips) {
    const reading = Number(slip.reading);
    if (!Number.isFinite(reading)) continue;
    slipMap.set(`${slip.machineNumber}:${slip.nozzleNumber}`, reading);
  }

  const byNozzleId: Record<string, number> = {};
  for (const pump of pumps) {
    const serial = pump.serialNumber?.trim();
    if (!serial) continue;
    for (const nozzle of pump.nozzles) {
      const reading = slipMap.get(`${serial}:${nozzle.nozzleNumber}`);
      if (reading != null) {
        byNozzleId[nozzle.id] = reading;
      }
    }
  }
  return byNozzleId;
}

export async function UpcomingShiftClosingContent() {
  const session = await requireTenantSession();
  await requirePermission(session, "shift-closing:read");
  const todayIst = formatInTimeZone(new Date(), IST_TIMEZONE, "yyyy-MM-dd");
  const yesterdayIst = toIstDateString(addDays(parseIstDate(todayIst), -1));

  const [
    layout,
    sixAmStatus,
    todaySlips,
    yesterdayRspRow,
    staff,
    prerequisites,
    previousClosingByNozzleId,
  ] = await Promise.all([
    getStationLayout(session.tenantId),
    getSixAmStatus(session.tenantId, todayIst),
    getMachineSlipEntries(session.tenantId, todayIst),
    getDailyRsp(session.tenantId, yesterdayIst),
    listStaff(session.tenantId),
    getUpcomingPrerequisites(session.tenantId, { dateStr: todayIst }),
    getLatestNozzleClosingReadings(session.tenantId),
  ]);

  const activeStaff = staff
    .filter((member) => member.isActive)
    .map((member) => ({ id: member.id, name: member.name }));

  const yesterdayRsp =
    yesterdayRspRow?.hsdPrice &&
    yesterdayRspRow?.msPrice &&
    yesterdayRspRow?.speedPrice
      ? {
          hsd: yesterdayRspRow.hsdPrice,
          ms: yesterdayRspRow.msPrice,
          speed: yesterdayRspRow.speedPrice,
        }
      : null;

  const todaySixAmReadingsByNozzleId = buildSixAmReadingsByNozzleId(
    layout.pumps,
    todaySlips.map((s) => ({
      machineNumber: s.machineNumber,
      nozzleNumber: s.nozzleNumber,
      reading: s.reading,
    }))
  );

  return (
    <div className="min-h-[42rem]">
      <ShiftClosingCalculator
        configuredPumps={layout.pumps}
        sixAmStatus={sixAmStatus}
        staffMembers={activeStaff}
        closingSource="upcoming"
        sixAmGateActive={prerequisites.requiresCheck}
        yesterdayRsp={yesterdayRsp}
        todaySixAmReadingsByNozzleId={todaySixAmReadingsByNozzleId}
        previousClosingByNozzleId={previousClosingByNozzleId}
      />
    </div>
  );
}
