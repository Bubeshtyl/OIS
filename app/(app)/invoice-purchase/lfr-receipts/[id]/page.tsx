import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LfrInvoiceForm } from "@/components/forms/lfr-invoice-form";
import { PageHeader } from "@/components/shared/page-blocks";
import { buttonVariants } from "@/components/ui/button";
import { requireTenantSession } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/rbac";
import { getLfrInvoiceById } from "@/lib/queries/lfr-invoice";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EditLfrReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "taxation:read"))) {
    redirect("/");
  }

  const { id } = await params;
  const invoice = await getLfrInvoiceById(session.tenantId, id);
  if (!invoice) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader title="Edit LFR Invoice" subtitle={invoice.invoiceNo} />
        <Link
          href="/invoice-purchase/lfr-receipts"
          className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
        >
          Back to list
        </Link>
      </div>

      <LfrInvoiceForm editInvoice={invoice} />
    </div>
  );
}
