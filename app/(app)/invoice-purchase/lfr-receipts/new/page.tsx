import Link from "next/link";
import { LfrInvoiceForm } from "@/components/forms/lfr-invoice-form";
import { PageHeader } from "@/components/shared/page-blocks";
import { buttonVariants } from "@/components/ui/button";
import { requireTenantSession } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/rbac";
import { cn } from "@/lib/utils";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewLfrReceiptPage() {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "taxation:read"))) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader title="New LFR Invoice" />
        <Link
          href="/invoice-purchase/lfr-receipts"
          className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
        >
          Back to list
        </Link>
      </div>

      <LfrInvoiceForm />
    </div>
  );
}
