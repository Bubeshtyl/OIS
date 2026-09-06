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
  type SixAmStatus,
} from "@/lib/shift-closing/service";
import { UPCOMING_PREREQ_HOUR_IST } from "@/lib/shift-closing/upcoming-prerequisites";
import {
  getStationLayout,
  type PumpWithNozzles,
} from "@/lib/station-config/service";
import { listActiveStaffOptions } from "@/lib/staff/service";
import { IST_TIMEZONE, isAtOrAfterIstHour } from "@/lib/timezone";

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

function buildSixAmStatus(
  dateStr: string,
  rspRow: Awaited<ReturnType<typeof getDailyRsp>>,
  slipCount: number
): SixAmStatus {
  const hasRsp = Boolean(
    rspRow?.hsdPrice && rspRow?.msPrice && rspRow?.speedPrice
  );
  const hasSlipEntry = slipCount > 0;
  return {
    hasRsp,
    hasSlipEntry,
    isReady: hasRsp && hasSlipEntry,
    dateStr,
    rspPrices: rspRow
      ? {
          hsd: rspRow.hsdPrice,
          ms: rspRow.msPrice,
          speed: rspRow.speedPrice,
        }
      : null,
    slipEntriesCount: slipCount,
  };
}

export async function UpcomingShiftClosingContent() {
  const session = await requireTenantSession();
  await requirePermission(session, "shift-closing:read");
  const todayIst = formatInTimeZone(new Date(), IST_TIMEZONE, "yyyy-MM-dd");
  const yesterdayIst = toIstDateString(addDays(parseIstDate(todayIst), -1));
  // Gate hour is clock-only — no extra DB round-trip.
  const sixAmGateActive = isAtOrAfterIstHour(UPCOMING_PREREQ_HOUR_IST);

  const [
    layout,
    todayRspRow,
    yesterdayRspRow,
    todaySlips,
    staffMembers,
    previousClosingByNozzleId,
  ] = await Promise.all([
    getStationLayout(session.tenantId),
    getDailyRsp(session.tenantId, todayIst),
    getDailyRsp(session.tenantId, yesterdayIst),
    getMachineSlipEntries(session.tenantId, todayIst),
    listActiveStaffOptions(session.tenantId),
    getLatestNozzleClosingReadings(session.tenantId),
  ]);

  const sixAmStatus = buildSixAmStatus(todayIst, todayRspRow, todaySlips.length);

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
        staffMembers={staffMembers}
        closingSource="upcoming"
        sixAmGateActive={sixAmGateActive}
        yesterdayRsp={yesterdayRsp}
        todaySixAmReadingsByNozzleId={todaySixAmReadingsByNozzleId}
        previousClosingByNozzleId={previousClosingByNozzleId}
      />
    </div>
  );
}
