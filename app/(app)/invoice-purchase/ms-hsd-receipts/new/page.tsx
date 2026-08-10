import Link from "next/link";
import { MsHsdInvoiceForm } from "@/components/forms/ms-hsd-invoice-form";
import { PageHeader } from "@/components/shared/page-blocks";
import { buttonVariants } from "@/components/ui/button";
import { requireTenantSession } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/rbac";
import { cn } from "@/lib/utils";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewMsHsdReceiptPage() {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "receive:write"))) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader title="New MS / HSD Invoice" />
        <Link
          href="/invoice-purchase/ms-hsd-receipts"
          className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
        >
          Back to list
        </Link>
      </div>

      <MsHsdInvoiceForm />
    </div>
  );
}
