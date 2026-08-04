import type { Tenant } from "@/lib/db/schema";

/** One-line address for lists; empty string if nothing set. */
export function formatStationAddress(
  tenant: Pick<
    Tenant,
    | "addressLine1"
    | "addressLine2"
    | "city"
    | "state"
    | "pincode"
  >
): string {
  const parts = [
    tenant.addressLine1,
    tenant.addressLine2,
    [tenant.city, tenant.state].filter(Boolean).join(", "),
    tenant.pincode,
  ]
    .map((part) => part?.trim())
    .filter(Boolean);
  return parts.join(" · ");
}
