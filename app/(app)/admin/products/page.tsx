import { Suspense } from "react";
import {
  AddProductButton,
  ProductsAdmin,
} from "@/components/admin/products-admin";
import { PageHeader } from "@/components/shared/page-blocks";
import { getAllProducts } from "@/lib/queries/inventory";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await getAllProducts();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Oil Products"
        subtitle="Manage oil types, pack sizes, and pricing"
        action={<AddProductButton />}
      />
      <Suspense fallback={<div className="p-4">Loading products...</div>}>
        <ProductsAdmin products={products} />
      </Suspense>
    </div>
  );
}
