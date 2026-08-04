import { redirect } from "next/navigation";
import { PlatformTenantsAdmin } from "@/components/platform/tenants-admin";
import { PageHeader } from "@/components/shared/page-blocks";
import { getPlatformTenants } from "@/lib/actions/platform";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.isPlatformAdmin) {
    redirect("/login");
  }

  const tenants = await getPlatformTenants();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform"
        subtitle="Create stations, reset Admin passwords, suspend access, and check basic health."
      />
      <PlatformTenantsAdmin tenants={tenants} />
    </div>
  );
}
