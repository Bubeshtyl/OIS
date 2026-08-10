export const MS_HSD_PRODUCTS = ["EBMS", "HSD", "SPEED"] as const;

export type MsHsdProduct = (typeof MS_HSD_PRODUCTS)[number];

export function isMsHsdProduct(value: string): value is MsHsdProduct {
  return (MS_HSD_PRODUCTS as readonly string[]).includes(value);
}
