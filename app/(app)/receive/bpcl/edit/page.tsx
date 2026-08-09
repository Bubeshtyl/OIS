import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BpclReceiveForm } from "@/components/forms/bpcl-receive-form";
import { PageHeader } from "@/components/shared/page-blocks";
import { buttonVariants } from "@/components/ui/button";
import { requireTenantSession } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/rbac";
import { getDb } from "@/lib/db";
import { oilProducts } from "@/lib/db/schema";
import { getBpclInvoiceBatch } from "@/lib/queries/bpcl-invoice";
import { getActiveProducts } from "@/lib/queries/inventory";
import { cn } from "@/lib/utils";
import { and, eq, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function EditBpclInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ invoice?: string }>;
}) {
  const session = await requireTenantSession();
  if (!(await hasPermission(session, "receive:write"))) {
    redirect("/");
  }

  const params = await searchParams;
  const invoice = params.invoice?.trim();
  if (!invoice) {
    notFound();
  }

  const [activeProducts, lines] = await Promise.all([
    getActiveProducts(session.tenantId),
    getBpclInvoiceBatch(session.tenantId, invoice),
  ]);

  if (lines.length === 0) {
    notFound();
  }

  const missingIds = lines
    .map((line) => line.productId)
    .filter((id) => !activeProducts.some((p) => p.id === id));

  let products = activeProducts;
  if (missingIds.length > 0) {
    const db = getDb();
    const extras = await db
      .select()
      .from(oilProducts)
      .where(
        and(
          eq(oilProducts.tenantId, session.tenantId),
          inArray(oilProducts.id, missingIds)
        )
      );
    products = [...activeProducts, ...extras].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  const transactionDate = lines[0]?.transactionDate;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Edit BPCL Invoice"
          subtitle={`Invoice ${invoice}`}
        />
        <Link
          href="/receive"
          className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
        >
          Back to Stock Received
        </Link>
      </div>

      <BpclReceiveForm
        products={products}
        editInvoice={{
          originalInvoice: invoice,
          transactionDate,
          lines,
        }}
      />
    </div>
  );
}
