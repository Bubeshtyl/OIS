import { ComingSoonPage } from "@/components/shared/coming-soon-page";
import { requireTenantSession } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/rbac";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PurchaseInvoicePage() {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "taxation:read"))) {
    redirect("/");
  }

  return <ComingSoonPage title="Purchase Invoice" />;
}
