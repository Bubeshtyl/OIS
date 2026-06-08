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
  returned: number;
  sold: number;
  damaged: number;
  balance: number;
  openingPackets: number;
  receivedPackets: number;
  issuedPackets: number;
  returnedPackets: number;
  soldPackets: number;
  damagedPackets: number;
  balancePackets: number;
};

export type VarianceReportRow = {
  productId: string;
  name: string;
  opening: number;
  received: number;
  issued: number;
  returned: number;
  damaged: number;
  depotBalance: number;
  variance: number;
  openingPackets: number;
  receivedPackets: number;
  issuedPackets: number;
  returnedPackets: number;
  damagedPackets: number;
  depotBalancePackets: number;
  variancePackets: number;
};

function emptyPeriod() {
  return {
    received: 0,
    issued: 0,
    returned: 0,
    consumed: 0,
    damaged: 0,
    receivedPackets: 0,
    issuedPackets: 0,
    returnedPackets: 0,
    consumedPackets: 0,
    damagedPackets: 0,
  };
}

export async function getStockSummaryReport(startDate: string, endDate: string) {
  const [stock, activity] = await Promise.all([
    getStockSummary(),
    getProductActivityForRange(startDate, endDate),
  ]);

  const rows: StockSummaryReportRow[] = stock.products.map((product) => {
    const period = activity.get(product.id) ?? emptyPeriod();
    const opening =
      product.depot - period.received + period.issued - period.returned;
    const openingPackets =
      product.depotPackets -
      period.receivedPackets +
      period.issuedPackets -
      period.returnedPackets;
    const sold = period.consumed - period.damaged;
    const soldPackets = period.consumedPackets - period.damagedPackets;
    const balance = opening + period.received - period.issued + period.returned;
    const balancePackets =
      openingPackets +
      period.receivedPackets -
      period.issuedPackets +
      period.returnedPackets;

    return {
      productId: product.id,
      name: product.name,
      opening,
      received: period.received,
      issued: period.issued,
      returned: period.returned,
      sold,
      damaged: period.damaged,
      balance,
      openingPackets,
      receivedPackets: period.receivedPackets,
      issuedPackets: period.issuedPackets,
      returnedPackets: period.returnedPackets,
      soldPackets,
      damagedPackets: period.damagedPackets,
      balancePackets,
    };
  });

  const totals = rows.reduce(
    (acc, row) => ({
      opening: acc.opening + row.opening,
      received: acc.received + row.received,
      issued: acc.issued + row.issued,
      returned: acc.returned + row.returned,
      sold: acc.sold + row.sold,
      damaged: acc.damaged + row.damaged,
      balance: acc.balance + row.balance,
      openingPackets: acc.openingPackets + row.openingPackets,
      receivedPackets: acc.receivedPackets + row.receivedPackets,
      issuedPackets: acc.issuedPackets + row.issuedPackets,
      returnedPackets: acc.returnedPackets + row.returnedPackets,
      soldPackets: acc.soldPackets + row.soldPackets,
      damagedPackets: acc.damagedPackets + row.damagedPackets,
      balancePackets: acc.balancePackets + row.balancePackets,
    }),
    {
      opening: 0,
      received: 0,
      issued: 0,
      returned: 0,
      sold: 0,
      damaged: 0,
      balance: 0,
      openingPackets: 0,
      receivedPackets: 0,
      issuedPackets: 0,
      returnedPackets: 0,
      soldPackets: 0,
      damagedPackets: 0,
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
    const opening =
      product.depot - period.received + period.issued - period.returned;
    const openingPackets =
      product.depotPackets -
      period.receivedPackets +
      period.issuedPackets -
      period.returnedPackets;
    // Depot: opening + received − issued + returned = closing (damaged is at Manager).
    const variance =
      opening + period.received - period.issued + period.returned - product.depot;
    const variancePackets =
      openingPackets +
      period.receivedPackets -
      period.issuedPackets +
      period.returnedPackets -
      product.depotPackets;

    return {
      productId: product.id,
      name: product.name,
      opening,
      received: period.received,
      issued: period.issued,
      returned: period.returned,
      damaged: period.damaged,
      depotBalance: product.depot,
      variance,
      openingPackets,
      receivedPackets: period.receivedPackets,
      issuedPackets: period.issuedPackets,
      returnedPackets: period.returnedPackets,
      damagedPackets: period.damagedPackets,
      depotBalancePackets: product.depotPackets,
      variancePackets,
    };
  });

  const totals = rows.reduce(
    (acc, row) => ({
      opening: acc.opening + row.opening,
      received: acc.received + row.received,
      issued: acc.issued + row.issued,
      returned: acc.returned + row.returned,
      damaged: acc.damaged + row.damaged,
      depotBalance: acc.depotBalance + row.depotBalance,
      variance: acc.variance + row.variance,
      openingPackets: acc.openingPackets + row.openingPackets,
      receivedPackets: acc.receivedPackets + row.receivedPackets,
      issuedPackets: acc.issuedPackets + row.issuedPackets,
      returnedPackets: acc.returnedPackets + row.returnedPackets,
      damagedPackets: acc.damagedPackets + row.damagedPackets,
      depotBalancePackets: acc.depotBalancePackets + row.depotBalancePackets,
      variancePackets: acc.variancePackets + row.variancePackets,
    }),
    {
      opening: 0,
      received: 0,
      issued: 0,
      returned: 0,
      damaged: 0,
      depotBalance: 0,
      variance: 0,
      openingPackets: 0,
      receivedPackets: 0,
      issuedPackets: 0,
      returnedPackets: 0,
      damagedPackets: 0,
      depotBalancePackets: 0,
      variancePackets: 0,
    }
  );

  return { rows, totals };
}
