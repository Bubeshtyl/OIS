import type { TransactionListRow } from "@/lib/transactions/types";
import {
  parsePackageCountFromNote,
  transactionPacketCount,
  type PackagingProduct,
} from "@/lib/packaging";

type PacketRow = {
  type: "RECEIVE" | "TRANSFER" | "SALE" | "RETURNED" | "DAMAGED" | "REVERSAL";
  quantity: string | number;
  referenceNote?: string | null;
  packetsPerBox?: string | null;
  volumePerPacket?: string | null;
};

function rowPacketCount(row: PacketRow) {
  const litres = Number(row.quantity);
  const packageCount = parsePackageCountFromNote(row.referenceNote);
  const product: PackagingProduct = {
    packetsPerBox: row.packetsPerBox,
    volumePerPacket: row.volumePerPacket,
  };

  return transactionPacketCount(
    row.type === "REVERSAL" ? "RECEIVE" : row.type,
    litres,
    packageCount,
    product
  );
}

export function transactionRowPackets(row: TransactionListRow): number {
  return rowPacketCount(row);
}

export function ledgerRowPackets(row: PacketRow): number {
  return rowPacketCount(row);
}
