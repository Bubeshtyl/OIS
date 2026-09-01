import type { ShiftClosingEntityType } from "@/lib/db/schema";

export class EditRequiresApprovalError extends Error {
  constructor(message = "This entry already exists. Submit an edit request from the ledger.") {
    super(message);
    this.name = "EditRequiresApprovalError";
  }
}

export interface DailyRspProposedData {
  priceDate: string;
  hsdPrice: string;
  msPrice: string;
  speedPrice: string;
}

export interface MachineSlipProposedData {
  entryDate: string;
  machineNumber: string;
  nozzleNumber: number;
  reading: string;
}

export interface InterimNozzleProposedData {
  nozzleId?: string | null;
  nozzleName: string;
  openingReading: number;
  closingReading: number;
  testVolume: number;
  netVolume: number;
  ratePerLitre?: number | null;
  salesAmount?: number | null;
}

export interface InterimPaymentProposedData {
  cashAmount: number;
  cashDenominations?: Record<string, unknown> | null;
  pinelabsCard: number;
  pinelabsUpi: number;
  pinelabsAlp: number;
  pos: number;
  qr: number;
  ufill: number;
  bill: number;
  expenses: number;
  totalCollected: number;
}

export interface InterimShiftClosingProposedData {
  pumpId?: string | null;
  pumpNumber: number;
  pumpName: string;
  staffId: string;
  shiftDate?: string;
  totalGross: number;
  totalTest: number;
  totalNetLitres: number;
  totalSalesAmount: number;
  totalCollected: number;
  difference: number;
  paymentBreakdown?: InterimPaymentProposedData | null;
  nozzleReadings: InterimNozzleProposedData[];
}

export type ShiftClosingProposedData =
  | DailyRspProposedData
  | MachineSlipProposedData
  | InterimShiftClosingProposedData;

export interface EditRequestListItem {
  id: string;
  entityType: ShiftClosingEntityType;
  entityId: string;
  status: string;
  requestNote: string | null;
  reviewNote: string | null;
  requestedAt: Date;
  reviewedAt: Date | null;
  requestedByUserId: string;
  requestedByName: string | null;
  reviewedByName: string | null;
  proposedData: ShiftClosingProposedData;
  currentData: ShiftClosingProposedData | Record<string, unknown> | null;
  entityLabel: string;
}

export interface InterimShiftClosingDetail {
  id: string;
  pumpNumber: number;
  pumpName: string;
  staffId: string | null;
  staffName: string | null;
  shiftDate: Date;
  totalGross: string;
  totalTest: string;
  totalNetLitres: string;
  totalSalesAmount: string;
  totalCollected: string;
  difference: string;
  revision: number;
  createdAt: Date;
  createdByName: string | null;
  nozzleReadings: Array<{
    id: string;
    nozzleId: string | null;
    nozzleName: string;
    openingReading: string;
    closingReading: string;
    testVolume: string;
    netVolume: string;
    ratePerLitre: string | null;
    salesAmount: string | null;
  }>;
  paymentCollection: {
    cashAmount: string;
    cashDenominations: Record<string, unknown> | null;
    pinelabsCard: string;
    pinelabsUpi: string;
    pinelabsAlp: string;
    pos: string;
    qr: string;
    ufill: string;
    bill: string;
    expenses: string;
    totalCollected: string;
  } | null;
}

export function interimDetailToProposed(
  detail: InterimShiftClosingDetail
): InterimShiftClosingProposedData {
  return {
    pumpId: null,
    pumpNumber: detail.pumpNumber,
    pumpName: detail.pumpName,
    staffId: detail.staffId || "",
    shiftDate: detail.shiftDate.toISOString(),
    totalGross: Number(detail.totalGross),
    totalTest: Number(detail.totalTest),
    totalNetLitres: Number(detail.totalNetLitres),
    totalSalesAmount: Number(detail.totalSalesAmount),
    totalCollected: Number(detail.totalCollected),
    difference: Number(detail.difference),
    paymentBreakdown: detail.paymentCollection
      ? {
          cashAmount: Number(detail.paymentCollection.cashAmount),
          cashDenominations: detail.paymentCollection.cashDenominations,
          pinelabsCard: Number(detail.paymentCollection.pinelabsCard),
          pinelabsUpi: Number(detail.paymentCollection.pinelabsUpi),
          pinelabsAlp: Number(detail.paymentCollection.pinelabsAlp),
          pos: Number(detail.paymentCollection.pos),
          qr: Number(detail.paymentCollection.qr),
          ufill: Number(detail.paymentCollection.ufill),
          bill: Number(detail.paymentCollection.bill),
          expenses: Number(detail.paymentCollection.expenses),
          totalCollected: Number(detail.paymentCollection.totalCollected),
        }
      : null,
    nozzleReadings: detail.nozzleReadings.map((n) => ({
      nozzleId: n.nozzleId,
      nozzleName: n.nozzleName,
      openingReading: Number(n.openingReading),
      closingReading: Number(n.closingReading),
      testVolume: Number(n.testVolume),
      netVolume: Number(n.netVolume),
      ratePerLitre: n.ratePerLitre != null ? Number(n.ratePerLitre) : null,
      salesAmount: n.salesAmount != null ? Number(n.salesAmount) : null,
    })),
  };
}
