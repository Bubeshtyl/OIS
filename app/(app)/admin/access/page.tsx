import { redirect } from "next/navigation";
import { AccessAdmin } from "@/components/admin/access-admin";
import { PageHeader } from "@/components/shared/page-blocks";
import { getAccessConfiguration } from "@/lib/actions/access";
import { getDefaultPath } from "@/lib/auth/rbac";
import { getSession } from "@/lib/auth/session";
import { isRbacAccessUiEnabled } from "@/lib/features";

export const dynamic = "force-dynamic";

export default async function AdminAccessPage() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    redirect("/login");
  }

  if (!isRbacAccessUiEnabled() || session.role !== "ADMIN") {
    redirect(getDefaultPath(session.role));
  }

  const config = await getAccessConfiguration();
  if (!config) {
    redirect(getDefaultPath(session.role));
  }

  return (
    <div>
      <PageHeader
        title="Access"
        subtitle="Choose which sidebar routes Manager and Accounts roles can use. Changes apply to navigation and URL access."
      />
      <AccessAdmin
        catalog={config.catalog}
        permissionsByRole={config.permissionsByRole}
      />
    </div>
  );
}
