import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { PageHeader } from "@/components/shared/page-blocks";
import { SixAmShiftClosingForm } from "@/components/shift-closing/six-am-closing";
import { InterimCalculator } from "@/components/shift-closing/interim-calculator";
import { requireTenantSession } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/rbac";
import { getStationLayout } from "@/lib/station-config/service";
import { IST_TIMEZONE } from "@/lib/timezone";

export const dynamic = "force-dynamic";

export default async function SixAmShiftClosingPage() {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "shift-closing:read"))) {
    redirect("/");
  }

  const [layout, todayFormatted] = await Promise.all([
    getStationLayout(session.tenantId),
    Promise.resolve(formatInTimeZone(new Date(), IST_TIMEZONE, "dd-MM-yyyy (EEEE)")),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="6 AM Shift Closing" />
      <SixAmShiftClosingForm todayDate={todayFormatted} />
      <InterimCalculator configuredPumps={layout.pumps} />
    </div>
  );
}
