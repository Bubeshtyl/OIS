import { redirect } from "next/navigation";
import { AccessAdmin } from "@/components/admin/access-admin";
import { getAccessConfiguration } from "@/lib/actions/access";
import { getDefaultPath, getDefaultPathSync } from "@/lib/auth/rbac";
import { isSystemAdminFromSession } from "@/lib/auth/session-access";
import { getSession } from "@/lib/auth/session";

export async function AccessAdminContent() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    redirect("/login");
  }

  const cachedAdmin = isSystemAdminFromSession(session);
  if (cachedAdmin === false) {
    redirect(getDefaultPathSync(session) ?? "/");
  }

  const config = await getAccessConfiguration();
  if (!config) {
    redirect(getDefaultPathSync(session) ?? (await getDefaultPath(session)));
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
