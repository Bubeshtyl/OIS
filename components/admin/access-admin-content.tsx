import { redirect } from "next/navigation";
import { AccessAdmin } from "@/components/admin/access-admin";
import { getAccessConfiguration } from "@/lib/actions/access";
import { getDefaultPath } from "@/lib/auth/rbac";
import { getSession } from "@/lib/auth/session";

export async function AccessAdminContent() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    redirect("/login");
  }

  const config = await getAccessConfiguration();
  if (!config) {
    redirect(await getDefaultPath(session));
  }

  return (
    <AccessAdmin
      catalog={config.catalog}
      roles={config.roles}
      assignableRoles={config.assignableRoles}
      permissionsByRoleId={config.permissionsByRoleId}
      staff={config.staff}
      adminRoleId={config.adminRoleId}
    />
  );
}
