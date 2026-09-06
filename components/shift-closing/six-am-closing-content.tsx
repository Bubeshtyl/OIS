import { formatInTimeZone } from "date-fns-tz";
import { SixAmShiftClosingForm } from "@/components/shift-closing/six-am-closing";
import { requireTenantSession } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-permission";
import { getDailyRsp, getMachineSlipEntries } from "@/lib/shift-closing/service";
import {
  buildMachineSlipGroups,
  getStationLayout,
} from "@/lib/station-config/service";
import { IST_TIMEZONE } from "@/lib/timezone";

export async function SixAmClosingContent() {
  const session = await requireTenantSession();
  await requirePermission(session, "shift-closing:read");
  const todayIst = formatInTimeZone(new Date(), IST_TIMEZONE, "yyyy-MM-dd");

  const [existingRsp, existingSlips, layout] = await Promise.all([
    getDailyRsp(session.tenantId, todayIst),
    getMachineSlipEntries(session.tenantId, todayIst),
    getStationLayout(session.tenantId),
  ]);

  return (
    <SixAmShiftClosingForm
      initialDate={todayIst}
      initialRsp={
        existingRsp
          ? {
              hsd: existingRsp.hsdPrice,
              ms: existingRsp.msPrice,
              speed: existingRsp.speedPrice,
            }
          : null
      }
      initialSlips={existingSlips.map((s) => ({
        machineNumber: s.machineNumber,
        nozzleNumber: s.nozzleNumber,
        reading: s.reading,
      }))}
      slipGroups={buildMachineSlipGroups(layout.pumps)}
    />
  );
}
