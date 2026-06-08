import { revalidatePath } from "next/cache";

const INVENTORY_PATHS = [
  "/dashboard",
  "/stock-count",
  "/receive",
  "/transfer",
  "/sales",
  "/reports",
] as const;

export function revalidateInventoryPages() {
  for (const path of INVENTORY_PATHS) {
    revalidatePath(path);
  }
}

export function revalidateProductPages() {
  revalidatePath("/admin/products");
  revalidateInventoryPages();
}

export function revalidateUserPages() {
  revalidatePath("/admin/users");
}
