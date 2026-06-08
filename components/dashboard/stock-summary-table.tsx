import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DashboardLocation } from "@/components/dashboard/dashboard-location-tabs";
import { formatStockQuantity, type StockDisplayUnit } from "@/lib/format";

type ProductRow = {
  id: string;
  name: string;
  depot: number;
  manager: number;
  depotPackets: number;
  managerPackets: number;
};

type PeriodRow = {
  received: number;
  issued: number;
  consumed: number;
  receivedPackets: number;
  issuedPackets: number;
  consumedPackets: number;
};

function StockAmount({
  packets,
  litres,
  unit,
  emphasize = false,
}: {
  packets: number;
  litres: number;
  unit: StockDisplayUnit;
  emphasize?: boolean;
}) {
  return (
    <span className={emphasize ? "font-semibold text-emerald-700" : "font-medium"}>
      {formatStockQuantity(unit, packets, litres)}
    </span>
  );
}

function emptyPeriod(): PeriodRow {
  return {
    received: 0,
    issued: 0,
    consumed: 0,
    receivedPackets: 0,
    issuedPackets: 0,
    consumedPackets: 0,
  };
}

function DepotRows({
  products,
  productActivity,
  unit,
}: {
  products: ProductRow[];
  productActivity: Record<string, PeriodRow>;
  unit: StockDisplayUnit;
}) {
  let totalReceivedPackets = 0;
  let totalReceivedLitres = 0;
  let totalIssuedPackets = 0;
  let totalIssuedLitres = 0;
  let totalBalancePackets = 0;
  let totalBalanceLitres = 0;

  const rows = products.map((product) => {
    const period = productActivity[product.id] ?? emptyPeriod();

    totalReceivedPackets += period.receivedPackets;
    totalReceivedLitres += period.received;
    totalIssuedPackets += period.issuedPackets;
    totalIssuedLitres += period.issued;
    totalBalancePackets += product.depotPackets;
    totalBalanceLitres += product.depot;

    return { product, period };
  });

  return (
    <>
      <TableHeader>
        <TableRow>
          <TableHead>Oil type</TableHead>
          <TableHead className="min-w-[4.5rem]">Received</TableHead>
          <TableHead className="min-w-[4.5rem]">Issued</TableHead>
          <TableHead className="min-w-[4.5rem]">Balance</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ product, period }) => (
          <TableRow key={product.id}>
            <TableCell className="font-medium">{product.name}</TableCell>
            <TableCell>
              <StockAmount
                packets={period.receivedPackets}
                litres={period.received}
                unit={unit}
              />
            </TableCell>
            <TableCell>
              <StockAmount
                packets={period.issuedPackets}
                litres={period.issued}
                unit={unit}
              />
            </TableCell>
            <TableCell>
              <StockAmount
                packets={product.depotPackets}
                litres={product.depot}
                unit={unit}
                emphasize
              />
            </TableCell>
          </TableRow>
        ))}
        <TableRow className="border-t-2 font-semibold">
          <TableCell>Total</TableCell>
          <TableCell>
            <StockAmount
              packets={totalReceivedPackets}
              litres={totalReceivedLitres}
              unit={unit}
            />
          </TableCell>
          <TableCell>
            <StockAmount
              packets={totalIssuedPackets}
              litres={totalIssuedLitres}
              unit={unit}
            />
          </TableCell>
          <TableCell>
            <StockAmount
              packets={totalBalancePackets}
              litres={totalBalanceLitres}
              unit={unit}
              emphasize
            />
          </TableCell>
        </TableRow>
      </TableBody>
    </>
  );
}

function ManagerRows({
  products,
  productActivity,
  unit,
}: {
  products: ProductRow[];
  productActivity: Record<string, PeriodRow>;
  unit: StockDisplayUnit;
}) {
  let totalIssuedPackets = 0;
  let totalIssuedLitres = 0;
  let totalConsumedPackets = 0;
  let totalConsumedLitres = 0;
  let totalBalancePackets = 0;
  let totalBalanceLitres = 0;

  const rows = products.map((product) => {
    const period = productActivity[product.id] ?? emptyPeriod();

    totalIssuedPackets += period.issuedPackets;
    totalIssuedLitres += period.issued;
    totalConsumedPackets += period.consumedPackets;
    totalConsumedLitres += period.consumed;
    totalBalancePackets += product.managerPackets;
    totalBalanceLitres += product.manager;

    return { product, period };
  });

  return (
    <>
      <TableHeader>
        <TableRow>
          <TableHead>Oil type</TableHead>
          <TableHead className="min-w-[4.5rem]">Issued</TableHead>
          <TableHead className="min-w-[4.5rem]">Consumption</TableHead>
          <TableHead className="min-w-[4.5rem]">Balance</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ product, period }) => (
          <TableRow key={product.id}>
            <TableCell className="font-medium">{product.name}</TableCell>
            <TableCell>
              <StockAmount
                packets={period.issuedPackets}
                litres={period.issued}
                unit={unit}
              />
            </TableCell>
            <TableCell>
              <StockAmount
                packets={period.consumedPackets}
                litres={period.consumed}
                unit={unit}
              />
            </TableCell>
            <TableCell>
              <StockAmount
                packets={product.managerPackets}
                litres={product.manager}
                unit={unit}
                emphasize
              />
            </TableCell>
          </TableRow>
        ))}
        <TableRow className="border-t-2 font-semibold">
          <TableCell>Total</TableCell>
          <TableCell>
            <StockAmount
              packets={totalIssuedPackets}
              litres={totalIssuedLitres}
              unit={unit}
            />
          </TableCell>
          <TableCell>
            <StockAmount
              packets={totalConsumedPackets}
              litres={totalConsumedLitres}
              unit={unit}
            />
          </TableCell>
          <TableCell>
            <StockAmount
              packets={totalBalancePackets}
              litres={totalBalanceLitres}
              unit={unit}
              emphasize
            />
          </TableCell>
        </TableRow>
      </TableBody>
    </>
  );
}

function AllRows({
  products,
  unit,
}: {
  products: ProductRow[];
  unit: StockDisplayUnit;
}) {
  let totalDepotPackets = 0;
  let totalDepotLitres = 0;
  let totalManagerPackets = 0;
  let totalManagerLitres = 0;
  let totalPackets = 0;
  let totalLitres = 0;

  const rows = products.map((product) => {
    const total = product.depot + product.manager;
    const totalProductPackets = product.depotPackets + product.managerPackets;

    totalDepotPackets += product.depotPackets;
    totalDepotLitres += product.depot;
    totalManagerPackets += product.managerPackets;
    totalManagerLitres += product.manager;
    totalPackets += totalProductPackets;
    totalLitres += total;

    return { product, total, totalProductPackets };
  });

  return (
    <>
      <TableHeader>
        <TableRow>
          <TableHead>Oil type</TableHead>
          <TableHead className="min-w-[4.5rem]">Depot</TableHead>
          <TableHead className="min-w-[4.5rem]">Manager</TableHead>
          <TableHead className="min-w-[4.5rem]">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ product, total, totalProductPackets }) => (
          <TableRow key={product.id}>
            <TableCell className="font-medium">{product.name}</TableCell>
            <TableCell>
              <StockAmount
                packets={product.depotPackets}
                litres={product.depot}
                unit={unit}
              />
            </TableCell>
            <TableCell>
              <StockAmount
                packets={product.managerPackets}
                litres={product.manager}
                unit={unit}
              />
            </TableCell>
            <TableCell>
              <StockAmount
                packets={totalProductPackets}
                litres={total}
                unit={unit}
                emphasize
              />
            </TableCell>
          </TableRow>
        ))}
        <TableRow className="border-t-2 font-semibold">
          <TableCell>Total</TableCell>
          <TableCell>
            <StockAmount
              packets={totalDepotPackets}
              litres={totalDepotLitres}
              unit={unit}
            />
          </TableCell>
          <TableCell>
            <StockAmount
              packets={totalManagerPackets}
              litres={totalManagerLitres}
              unit={unit}
            />
          </TableCell>
          <TableCell>
            <StockAmount
              packets={totalPackets}
              litres={totalLitres}
              unit={unit}
              emphasize
            />
          </TableCell>
        </TableRow>
      </TableBody>
    </>
  );
}

export function StockSummaryTable({
  products,
  productActivity,
  location = "all",
  unit = "packets",
}: {
  products: ProductRow[];
  productActivity: Record<string, PeriodRow>;
  location?: DashboardLocation;
  unit?: StockDisplayUnit;
}) {
  return (
    <Table>
      {location === "depot" ? (
        <DepotRows
          products={products}
          productActivity={productActivity}
          unit={unit}
        />
      ) : location === "manager" ? (
        <ManagerRows
          products={products}
          productActivity={productActivity}
          unit={unit}
        />
      ) : (
        <AllRows products={products} unit={unit} />
      )}
    </Table>
  );
}
