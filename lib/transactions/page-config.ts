import type { TransactionListType } from "@/lib/queries/transactions";

export type TransactionPageKind = "receive" | "issued" | "consumption";

export const PAGE_KIND_TO_TYPE: Record<TransactionPageKind, TransactionListType> =
  {
    receive: "RECEIVE",
    issued: "TRANSFER",
    consumption: "SALE",
  };

export const PAGE_CONFIG: Record<
  TransactionPageKind,
  {
    title: string;
    subtitle: string;
    newButtonLabel: string;
    searchPlaceholder: string;
    staffFilterLabel: string;
    showStaffFilter: boolean;
  }
> = {
  receive: {
    title: "Stock Received",
    subtitle: "Supplier → Depot",
    newButtonLabel: "+ New Received",
    searchPlaceholder: "Search supplier, invoice or oil type…",
    staffFilterLabel: "All Suppliers",
    showStaffFilter: false,
  },
  issued: {
    title: "Stock Issued",
    subtitle: "Depot → Oil Manager",
    newButtonLabel: "+ New Issue",
    searchPlaceholder: "Search oil type or notes…",
    staffFilterLabel: "All Managers",
    showStaffFilter: false,
  },
  consumption: {
    title: "Daily Consumption",
    subtitle: "Oil Manager → Sold",
    newButtonLabel: "+ New Consumption",
    searchPlaceholder: "Search oil type or notes…",
    staffFilterLabel: "All Managers",
    showStaffFilter: false,
  },
};
