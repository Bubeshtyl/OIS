import { redirect } from "next/navigation";
import { AccessAdmin } from "@/components/admin/access-admin";
import { PageHeader } from "@/components/shared/page-blocks";
import { getAccessConfiguration } from "@/lib/actions/access";
import { getDefaultPath } from "@/lib/auth/rbac";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminAccessPage() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    redirect("/login");
  }

  const config = await getAccessConfiguration();
  if (!config) {
    redirect(await getDefaultPath(session));
  }

  return (
    <div>
      <PageHeader title="Roles & Access" />
      <AccessAdmin
        catalog={config.catalog}
        roles={config.roles}
        assignableRoles={config.assignableRoles}
        permissionsByRoleId={config.permissionsByRoleId}
        staff={config.staff}
        adminRoleId={config.adminRoleId}
      />
    </div>
  );
}
