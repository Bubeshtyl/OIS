import { ComingSoonPage } from "@/components/shared/coming-soon-page";
import { requireTenantSession } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/rbac";
import { redirect } from "next/navigation";


export default async function CustomersPage() {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "customers:read"))) {
    redirect("/");
  }

  return <ComingSoonPage title="Customer Management" />;
}
