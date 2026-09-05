import Link from "next/link";
import { BpclReceiveForm } from "@/components/forms/bpcl-receive-form";
import { PageHeader } from "@/components/shared/page-blocks";
import { buttonVariants } from "@/components/ui/button";
import { requireTenantSession } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/rbac";
import { getActiveProducts } from "@/lib/queries/inventory";
import { cn } from "@/lib/utils";
import { redirect } from "next/navigation";


export default async function ReceiveBpclPage() {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "receive:write"))) {
    redirect("/");
  }

  const products = await getActiveProducts(session.tenantId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader title="BPCL Stock Received" />
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/products"
            className={cn(buttonVariants({ variant: "default" }), "shrink-0")}
          >
            + Add Products
          </Link>
          <Link
            href="/receive"
            className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
          >
            Back to Stock Received
          </Link>
        </div>
      </div>

      <BpclReceiveForm products={products} />
    </div>
  );
}
