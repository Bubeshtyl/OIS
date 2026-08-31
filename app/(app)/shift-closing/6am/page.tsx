import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { PageHeader } from "@/components/shared/page-blocks";
import { SixAmShiftClosingForm } from "@/components/shift-closing/six-am-closing";
import { requireTenantSession } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/rbac";
import { IST_TIMEZONE } from "@/lib/timezone";
import { getDailyRsp, getMachineSlipEntries } from "@/lib/shift-closing/service";

export const dynamic = "force-dynamic";

export default async function SixAmShiftClosingPage() {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "shift-closing:read"))) {
    redirect("/");
  }

  const todayIst = formatInTimeZone(new Date(), IST_TIMEZONE, "yyyy-MM-dd");

  const [existingRsp, existingSlips] = await Promise.all([
    getDailyRsp(session.tenantId, todayIst),
    getMachineSlipEntries(session.tenantId, todayIst),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="6 AM" />
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
      />
    </div>
  );
}
