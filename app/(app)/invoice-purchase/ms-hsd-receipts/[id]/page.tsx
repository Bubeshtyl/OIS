import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MsHsdInvoiceForm } from "@/components/forms/ms-hsd-invoice-form";
import { PageHeader } from "@/components/shared/page-blocks";
import { buttonVariants } from "@/components/ui/button";
import { requireTenantSession } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/rbac";
import { getMsHsdInvoiceById } from "@/lib/queries/ms-hsd-invoice";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EditMsHsdReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "receive:write"))) {
    redirect("/");
  }

  const { id } = await params;
  const invoice = await getMsHsdInvoiceById(session.tenantId, id);
  if (!invoice) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Edit MS / HSD Invoice"
          subtitle={invoice.invoiceNo}
        />
        <Link
          href="/invoice-purchase/ms-hsd-receipts"
          className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
        >
          Back to list
        </Link>
      </div>

      <MsHsdInvoiceForm editInvoice={invoice} />
    </div>
  );
}
