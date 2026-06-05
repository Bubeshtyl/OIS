export type VolumeUnit = "litre" | "ml";
export type ProductUnit = "litre" | "millilitre";

export function productUnitFromVolumeUnit(
  volumeUnit: VolumeUnit
): ProductUnit {
  return volumeUnit === "ml" ? "millilitre" : "litre";
}

export function isVolumeProduct(unit: string) {
  return unit === "litre" || unit === "millilitre";
}

export function defaultVolumeUnit(productUnit: string): VolumeUnit {
  return productUnit === "millilitre" ? "ml" : "litre";
}

export function convertDisplayQuantity(
  value: string,
  from: VolumeUnit,
  to: VolumeUnit
): string {
  const num = Number(value);
  if (!value || Number.isNaN(num)) return value;
  if (from === to) return value;
  if (from === "litre" && to === "ml") {
    return String(Math.round(num * 1000));
  }
  const litres = num / 1000;
  return litres < 1 ? litres.toFixed(3).replace(/\.?0+$/, "") : String(litres);
}

export function toLitres(value: string, unit: VolumeUnit): string {
  const num = Number(value);
  if (!value || Number.isNaN(num) || num <= 0) return "";
  return unit === "ml" ? String(num / 1000) : String(num);
}

export function maxDisplayQuantity(
  balanceInLitres: number,
  unit: VolumeUnit
): number | undefined {
  if (!balanceInLitres) return undefined;
  return unit === "ml" ? balanceInLitres * 1000 : balanceInLitres;
}
