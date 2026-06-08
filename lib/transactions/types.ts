export type TransactionListType =
  | "RECEIVE"
  | "TRANSFER"
  | "SALE"
  | "RETURNED"
  | "DAMAGED";

export type TransactionListRow = {
  id: string;
  type: "RECEIVE" | "TRANSFER" | "SALE" | "RETURNED" | "DAMAGED" | "REVERSAL";
  quantity: string;
  transactionDate: string;
  createdAt: Date;
  referenceNote: string | null;
  productId: string;
  productName: string;
  unit: string;
  costPrice: string;
  sellingPrice: string;
  packetsPerBox: string | null;
  volumePerPacket: string | null;
  volumePerBox: string | null;
  createdByName: string;
  createdById: string;
  reversesTransactionId: string | null;
};

export type DisplayTransactionRow = TransactionListRow & {
  entryCount: number;
  isAggregated: boolean;
  aggregatedSupplier?: string;
  aggregatedInvoice?: string;
};

export type ReceiveSummary = {
  totalLitres: number;
  totalPackets: number;
  totalCost: number;
  avgCostPerLitre: number;
  count: number;
};

export type IssuedSummary = {
  totalLitres: number;
  totalPackets: number;
  count: number;
  activeCreators: number;
};

export type ConsumptionSummary = {
  totalLitres: number;
  totalPackets: number;
  count: number;
  dailyAverage: number;
  dailyAveragePackets: number;
};

export type TransactionListSummary =
  | ReceiveSummary
  | IssuedSummary
  | ConsumptionSummary;

export const TRANSACTION_LIST_PAGE_SIZE = 10;
