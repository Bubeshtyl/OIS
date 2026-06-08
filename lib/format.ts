import { isValidDateString, parseIstDate, toIstDateString } from "@/lib/date-range";
import type { OilProduct } from "@/lib/db/schema";
import {
  formatBoxCount,
  formatPacketCount,
  litresToPackets,
  parsePackageCountFromNote,
  transactionPacketCount,
  type PackagingProduct,
} from "@/lib/packaging";

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrCompactFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatInr(value: number | string): string {
  return inrFormatter.format(Number(value));
}

export function formatInrCompact(value: number | string): string {
  return inrCompactFormatter.format(Number(value));
}

export function formatLitres(value: number | string): string {
  const num = Number(value);
  const formatted = Number.isInteger(num)
    ? num.toLocaleString("en-IN")
    : num.toLocaleString("en-IN", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });
  return `${formatted} L`;
}

export function formatPackets(value: number | string): string {
  const num = Number(value);
  const formatted = Number.isInteger(num)
    ? num.toLocaleString("en-IN")
    : num.toLocaleString("en-IN", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });
  return `${formatted} packet${num === 1 ? "" : "s"}`;
}

export function formatTransactionQuantity(
  type:
    | "RECEIVE"
    | "TRANSFER"
    | "SALE"
    | "RETURNED"
    | "DAMAGED"
    | "REVERSAL",
  quantity: number | string,
  referenceNote: string | null | undefined,
  product: PackagingProduct,
  unit = "litre"
): string {
  const qty = Number(quantity);
  const packageCount = parsePackageCountFromNote(referenceNote);
  const packets = transactionPacketCount(type, qty, packageCount, product);

  if (packets > 0) {
    return `${formatPackets(packets)} (${formatLitres(qty)})`;
  }

  const fromLitres = litresToPackets(qty, product);
  if (fromLitres != null && fromLitres > 0) {
    return `${formatPackets(fromLitres)} (${formatLitres(qty)})`;
  }

  if (packageCount != null) {
    const label =
      type === "SALE" || type === "RETURNED" || type === "DAMAGED"
        ? formatPacketCount(packageCount)
        : formatBoxCount(packageCount);
    return `${label} (${formatLitres(qty)})`;
  }

  return formatQuantity(qty, unit);
}

export type StockDisplayUnit = "packets" | "litres";

function formatStockNumber(value: number | string): string {
  const num = Number(value);
  if (num === 0) return "0";

  return Number.isInteger(num)
    ? num.toLocaleString("en-IN")
    : num.toLocaleString("en-IN", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });
}

export function parseStockDisplayUnit(value?: string): StockDisplayUnit {
  return value === "litres" ? "litres" : "packets";
}

export function formatStockQuantity(
  unit: StockDisplayUnit,
  packets: number,
  litres: number
): string {
  const value = unit === "litres" || packets <= 0 ? litres : packets;
  return formatStockNumber(value);
}

export function formatSignedStockQuantity(
  unit: StockDisplayUnit,
  packets: number,
  litres: number
): string {
  const value = unit === "litres" || packets <= 0 ? litres : packets;
  if (value === 0) return "0";
  const prefix = value > 0 ? "+" : "-";
  return `${prefix}${formatStockNumber(Math.abs(value))}`;
}

export function formatStockCell(packets: number, litres: number) {
  if (packets > 0) {
    return {
      primary: formatPackets(packets),
      secondary: formatLitres(litres),
    };
  }

  return {
    primary: formatLitres(litres),
    secondary: null as string | null,
  };
}

export function formatStockAvailability(
  litres: number,
  product?: Pick<OilProduct, "volumePerPacket" | "unit"> | null
): string {
  const packets = product ? litresToPackets(litres, product) : null;
  if (packets != null) {
    return `${formatPackets(packets)} (${formatLitres(litres)})`;
  }
  return formatQuantity(litres, product?.unit ?? "litre");
}

export function formatSignedPackets(value: number | string): string {
  const num = Number(value);
  if (num === 0) return formatPackets(0);
  const prefix = num > 0 ? "+" : "-";
  return `${prefix}${formatPackets(Math.abs(num))}`;
}

export function formatSignedLitres(value: number | string): string {
  const num = Number(value);
  if (num === 0) return formatLitres(0);
  const prefix = num > 0 ? "+" : "-";
  return `${prefix}${formatLitres(Math.abs(num))}`;
}

export function formatQuantity(value: number | string, unit: string): string {
  const num = Number(value);
  const formatted = Number.isInteger(num) ? num.toString() : num.toFixed(1);
  const noPlural = unit === "litre" || unit === "millilitre";
  return `${formatted} ${unit}${num === 1 ? "" : noPlural ? "" : "s"}`;
}

export function formatDate(date: Date | string): string {
  const value =
    typeof date === "string" && isValidDateString(date)
      ? parseIstDate(date)
      : new Date(date);
  return dateFormatter.format(value);
}

export function formatDateTime(date: Date | string): string {
  return dateTimeFormatter.format(new Date(date));
}

export function toDateInputValue(date: Date): string {
  return toIstDateString(date);
}
