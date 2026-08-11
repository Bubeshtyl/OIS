/**
 * Per-packet landing price from a BPCL receive line.
 * `boxQuantity` should be the full billed case qty (including returned cases).
 */
export function computeLandingPrice({
  taxableValue,
  discountAmount,
  cgstAmount,
  sgstAmount,
  boxQuantity,
  packetsPerBox,
  invoiceDiscountPerPacket = 0,
  invoiceRoundingPerPacket = 0,
}: {
  taxableValue: number;
  discountAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  /** Full invoice cases, including returned. */
  boxQuantity: number;
  packetsPerBox: number;
  /** Invoice-level discount already divided across all packets. */
  invoiceDiscountPerPacket?: number;
  /** Invoice-level rounding already divided across all packets (may be negative). */
  invoiceRoundingPerPacket?: number;
}): number | null {
  if (
    !Number.isFinite(boxQuantity) ||
    boxQuantity <= 0 ||
    !Number.isFinite(packetsPerBox) ||
    packetsPerBox <= 0
  ) {
    return null;
  }

  const net =
    (Number.isFinite(taxableValue) ? taxableValue : 0) -
    (Number.isFinite(discountAmount) ? discountAmount : 0) +
    (Number.isFinite(cgstAmount) ? cgstAmount : 0) +
    (Number.isFinite(sgstAmount) ? sgstAmount : 0);

  const totalPackets = boxQuantity * packetsPerBox;
  if (totalPackets <= 0) return null;

  const perPacketInvoice =
    Number.isFinite(invoiceDiscountPerPacket) && invoiceDiscountPerPacket > 0
      ? invoiceDiscountPerPacket
      : 0;
  const perPacketRounding = Number.isFinite(invoiceRoundingPerPacket)
    ? invoiceRoundingPerPacket
    : 0;

  return net / totalPackets - perPacketInvoice + perPacketRounding;
}

/** Spread a whole-invoice discount evenly across every packet. */
export function invoiceDiscountPerPacket(
  invoiceDiscount: number,
  totalPackets: number
): number {
  if (
    !Number.isFinite(invoiceDiscount) ||
    invoiceDiscount <= 0 ||
    !Number.isFinite(totalPackets) ||
    totalPackets <= 0
  ) {
    return 0;
  }
  return invoiceDiscount / totalPackets;
}

/** Spread invoice rounding evenly across every packet (signed). */
export function invoiceRoundingPerPacket(
  roundingOff: number,
  totalPackets: number
): number {
  if (
    !Number.isFinite(roundingOff) ||
    roundingOff === 0 ||
    !Number.isFinite(totalPackets) ||
    totalPackets <= 0
  ) {
    return 0;
  }
  return roundingOff / totalPackets;
}

/** Packet-share of an invoice discount for one line (for stored discount totals). */
export function allocateInvoiceDiscount(
  invoiceDiscount: number,
  linePackets: number,
  totalPackets: number
): number {
  if (
    !Number.isFinite(invoiceDiscount) ||
    invoiceDiscount <= 0 ||
    !Number.isFinite(linePackets) ||
    linePackets <= 0 ||
    !Number.isFinite(totalPackets) ||
    totalPackets <= 0
  ) {
    return 0;
  }
  return invoiceDiscount * (linePackets / totalPackets);
}

export function formatLandingPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return value.toFixed(4);
}
