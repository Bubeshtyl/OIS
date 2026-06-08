import type { OilProduct } from "@/lib/db/schema";
import {
  describeBoxPackaging,
  getVolumePerPacketLitres,
} from "@/lib/packaging";

export const PRODUCT_CATEGORIES = [
  "Engine Oil",
  "Transmission Fluid",
  "Brake Fluid",
  "Coolant",
  "Grease",
  "General",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export function getProductCategory(name: string): ProductCategory {
  const lower = name.toLowerCase();
  if (lower.includes("transmission")) return "Transmission Fluid";
  if (lower.includes("brake")) return "Brake Fluid";
  if (lower.includes("coolant")) return "Coolant";
  if (lower.includes("grease")) return "Grease";
  if (
    lower.includes("engine") ||
    lower.includes("5w") ||
    lower.includes("10w") ||
    lower.includes("15w") ||
    lower.includes("20w") ||
    lower.includes("castrol") ||
    lower.includes("mobil")
  ) {
    return "Engine Oil";
  }
  return "General";
}

export function formatPacketSizeLabel(product: OilProduct): string | null {
  const litres = getVolumePerPacketLitres(product);
  if (litres == null) return null;
  if (litres < 1) {
    return `${Math.round(litres * 1000)} ml`;
  }
  return `${litres} L`;
}

export function formatPackSizes(product: OilProduct): string {
  const packetLabel = formatPacketSizeLabel(product);
  const boxLabel = describeBoxPackaging(product);

  if (packetLabel && product.packetsPerBox) {
    return `${packetLabel} · ${product.packetsPerBox}/box`;
  }
  if (packetLabel) {
    return packetLabel;
  }
  return boxLabel ?? "—";
}

export function formatDefaultUnit(unit: OilProduct["unit"]): string {
  return unit === "millilitre" ? "Millilitre" : "Litre";
}
