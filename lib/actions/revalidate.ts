import { revalidatePath } from "next/cache";

const INVENTORY_PATHS = [
  "/",
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
  revalidatePath("/admin/teams");
}

export function revalidateTeamPages() {
  revalidatePath("/admin/teams");
  revalidatePath("/admin/users");
}

export function revalidateTicketPages() {
  revalidatePath("/tickets");
}

export function revalidateQuestionPages() {
  revalidatePath("/admin/questions");
}

export function revalidateSettingsPages() {
  revalidatePath("/admin/settings");
}

export function revalidateAccessPages() {
  revalidatePath("/admin/access");
  // Nav and route guards depend on role permissions for the whole app.
  revalidatePath("/", "layout");
}
