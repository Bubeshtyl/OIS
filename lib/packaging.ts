import type { OilProduct } from "@/lib/db/schema";

export function getVolumePerPacketLitres(product: OilProduct): number | null {
  if (product.volumePerPacket == null) return null;
  const litres = Number(product.volumePerPacket);
  return litres > 0 ? litres : null;
}

export function getPacketsPerBox(product: OilProduct): number | null {
  if (product.packetsPerBox == null) return null;
  const count = Number(product.packetsPerBox);
  return count > 0 ? count : null;
}

export function getVolumePerBoxLitres(product: OilProduct): number | null {
  if (product.volumePerBox != null) {
    const litres = Number(product.volumePerBox);
    if (litres > 0) return litres;
  }

  const packets = getPacketsPerBox(product);
  const perPacket = getVolumePerPacketLitres(product);
  if (packets != null && perPacket != null) {
    return packets * perPacket;
  }

  return null;
}

export function litresFromBoxes(
  boxCount: number,
  product: OilProduct
): number | null {
  const perBox = getVolumePerBoxLitres(product);
  if (perBox == null || !Number.isFinite(boxCount) || boxCount < 1) {
    return null;
  }
  return boxCount * perBox;
}

export function litresFromPackets(
  packetCount: number,
  product: OilProduct
): number | null {
  const perPacket = getVolumePerPacketLitres(product);
  if (perPacket == null || !Number.isFinite(packetCount) || packetCount < 1) {
    return null;
  }
  return packetCount * perPacket;
}

export function hasBoxPackaging(product: OilProduct | undefined): boolean {
  return product != null && getVolumePerBoxLitres(product) != null;
}

export function hasPacketPackaging(product: OilProduct | undefined): boolean {
  return product != null && getVolumePerPacketLitres(product) != null;
}

export function parsePackageCountFromNote(note?: string | null): number | null {
  const match = note?.match(/^Packages:\s*(\d+)/i);
  if (!match) return null;
  const count = Number(match[1]);
  return Number.isInteger(count) && count > 0 ? count : null;
}

export type PackagingProduct = {
  packetsPerBox?: string | null;
  volumePerPacket?: string | null;
};

export function transactionPacketCount(
  type: "RECEIVE" | "TRANSFER" | "SALE" | "REVERSAL",
  quantityLitres: number,
  packageCount: number | null,
  product: PackagingProduct
): number {
  const packetsPerBox = getPacketsPerBox(product as OilProduct);
  const volumePerPacket = getVolumePerPacketLitres(product as OilProduct);

  if (type === "RECEIVE" || type === "TRANSFER") {
    if (packageCount != null && packetsPerBox != null) {
      return packageCount * packetsPerBox;
    }
    if (volumePerPacket != null) {
      return quantityLitres / volumePerPacket;
    }
    return 0;
  }

  if (type === "SALE") {
    if (packageCount != null) return packageCount;
    if (volumePerPacket != null) {
      return quantityLitres / volumePerPacket;
    }
    return 0;
  }

  return 0;
}

export function litresToPackets(
  litres: number,
  product: PackagingProduct
): number | null {
  const volumePerPacket = getVolumePerPacketLitres(product as OilProduct);
  if (volumePerPacket == null) return null;
  return litres / volumePerPacket;
}

export function formatPacketCount(count: number) {
  return `${count} packet${count === 1 ? "" : "s"}`;
}

export function formatBoxCount(count: number) {
  return `${count} box${count === 1 ? "" : "es"}`;
}

export function totalPacketsFromBoxes(
  boxCount: number,
  product: OilProduct
): number | null {
  const packetsPerBox = getPacketsPerBox(product);
  if (packetsPerBox == null || !Number.isFinite(boxCount) || boxCount < 1) {
    return null;
  }
  return boxCount * packetsPerBox;
}

export function describeBoxPackaging(product: OilProduct): string | null {
  const perBox = getVolumePerBoxLitres(product);
  const packets = getPacketsPerBox(product);
  const perPacket = getVolumePerPacketLitres(product);
  if (perBox == null) return null;

  if (packets != null && perPacket != null) {
    const packetLabel =
      perPacket < 1
        ? `${Math.round(perPacket * 1000)} ml`
        : `${perPacket} L`;
    return `${packets} × ${packetLabel} per box (${perBox} L/box)`;
  }

  return `${perBox} L per box`;
}
