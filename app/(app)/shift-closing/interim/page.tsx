import { PageHeader } from "@/components/shared/page-blocks";
import { ShiftClosingCalculator } from "@/components/shift-closing/interim-calculator";
import { requireTenantSession } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/rbac";
import { getStationLayout } from "@/lib/station-config/service";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function InterimShiftClosingPage() {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "shift-closing:read"))) {
    redirect("/");
  }

  const layout = await getStationLayout(session.tenantId);

  return (
    <div className="space-y-6">
      <PageHeader title="Interim Shift Closing" />
      <ShiftClosingCalculator configuredPumps={layout.pumps} />
    </div>
  );
}
