import {
  getProductActivityForRange,
  getStockSummary,
} from "@/lib/queries/inventory";

export type StockSummaryReportRow = {
  productId: string;
  name: string;
  opening: number;
  received: number;
  issued: number;
  consumption: number;
  balance: number;
  openingPackets: number;
  receivedPackets: number;
  issuedPackets: number;
  consumptionPackets: number;
  balancePackets: number;
};

export type VarianceReportRow = {
  productId: string;
  name: string;
  received: number;
  issued: number;
  depotBalance: number;
  variance: number;
  receivedPackets: number;
  issuedPackets: number;
  depotBalancePackets: number;
  variancePackets: number;
};

function emptyPeriod() {
  return {
    received: 0,
    issued: 0,
    consumed: 0,
    receivedPackets: 0,
    issuedPackets: 0,
    consumedPackets: 0,
  };
}

export async function getStockSummaryReport(startDate: string, endDate: string) {
  const [stock, activity] = await Promise.all([
    getStockSummary(),
    getProductActivityForRange(startDate, endDate),
  ]);

  const rows: StockSummaryReportRow[] = stock.products.map((product) => {
    const period = activity.get(product.id) ?? emptyPeriod();
    const opening = product.depot - period.received + period.issued;
    const openingPackets =
      product.depotPackets - period.receivedPackets + period.issuedPackets;
    const balance = opening + period.received - period.issued;
    const balancePackets =
      openingPackets + period.receivedPackets - period.issuedPackets;

    return {
      productId: product.id,
      name: product.name,
      opening,
      received: period.received,
      issued: period.issued,
      consumption: period.consumed,
      balance,
      openingPackets,
      receivedPackets: period.receivedPackets,
      issuedPackets: period.issuedPackets,
      consumptionPackets: period.consumedPackets,
      balancePackets,
    };
  });

  const totals = rows.reduce(
    (acc, row) => ({
      opening: acc.opening + row.opening,
      received: acc.received + row.received,
      issued: acc.issued + row.issued,
      consumption: acc.consumption + row.consumption,
      balance: acc.balance + row.balance,
      openingPackets: acc.openingPackets + row.openingPackets,
      receivedPackets: acc.receivedPackets + row.receivedPackets,
      issuedPackets: acc.issuedPackets + row.issuedPackets,
      consumptionPackets: acc.consumptionPackets + row.consumptionPackets,
      balancePackets: acc.balancePackets + row.balancePackets,
    }),
    {
      opening: 0,
      received: 0,
      issued: 0,
      consumption: 0,
      balance: 0,
      openingPackets: 0,
      receivedPackets: 0,
      issuedPackets: 0,
      consumptionPackets: 0,
      balancePackets: 0,
    }
  );

  return { rows, totals };
}

export async function getVarianceReport(startDate: string, endDate: string) {
  const [stock, activity] = await Promise.all([
    getStockSummary(),
    getProductActivityForRange(startDate, endDate),
  ]);

  const rows: VarianceReportRow[] = stock.products.map((product) => {
    const period = activity.get(product.id) ?? emptyPeriod();
    const variancePackets =
      period.receivedPackets - period.issuedPackets - product.depotPackets;
    const variance = period.received - period.issued - product.depot;

    return {
      productId: product.id,
      name: product.name,
      received: period.received,
      issued: period.issued,
      depotBalance: product.depot,
      variance,
      receivedPackets: period.receivedPackets,
      issuedPackets: period.issuedPackets,
      depotBalancePackets: product.depotPackets,
      variancePackets,
    };
  });

  const totals = rows.reduce(
    (acc, row) => ({
      received: acc.received + row.received,
      issued: acc.issued + row.issued,
      depotBalance: acc.depotBalance + row.depotBalance,
      variance: acc.variance + row.variance,
      receivedPackets: acc.receivedPackets + row.receivedPackets,
      issuedPackets: acc.issuedPackets + row.issuedPackets,
      depotBalancePackets: acc.depotBalancePackets + row.depotBalancePackets,
      variancePackets: acc.variancePackets + row.variancePackets,
    }),
    {
      received: 0,
      issued: 0,
      depotBalance: 0,
      variance: 0,
      receivedPackets: 0,
      issuedPackets: 0,
      depotBalancePackets: 0,
      variancePackets: 0,
    }
  );

  return { rows, totals };
}
