import { ProductsAdmin } from "@/components/admin/products-admin";
import { PageHeader } from "@/components/shared/page-blocks";
import { getAllProducts } from "@/lib/queries/inventory";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await getAllProducts();

  return (
    <div>
      <PageHeader title="Products" />
      <ProductsAdmin products={products} />
    </div>
  );
}
