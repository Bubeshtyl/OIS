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
import { cn } from "@/lib/utils";

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
  returned: number;
  consumed: number;
  damaged: number;
  receivedPackets: number;
  issuedPackets: number;
  returnedPackets: number;
  consumedPackets: number;
  damagedPackets: number;
};

function StockAmount({
  packets,
  litres,
  unit,
  emphasize = false,
  destructive = false,
}: {
  packets: number;
  litres: number;
  unit: StockDisplayUnit;
  emphasize?: boolean;
  destructive?: boolean;
}) {
  return (
    <span
      className={cn(
        "font-medium",
        emphasize && "font-semibold text-emerald-700",
        destructive && "text-destructive"
      )}
    >
      {formatStockQuantity(unit, packets, litres)}
    </span>
  );
}

function emptyPeriod(): PeriodRow {
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

function DepotRows({
  products,
  productActivity,
  unit,
}: {
  products: ProductRow[];
  productActivity: Record<string, PeriodRow>;
  unit: StockDisplayUnit;
}) {
  let totalOpeningPackets = 0;
  let totalOpeningLitres = 0;
  let totalReceivedPackets = 0;
  let totalReceivedLitres = 0;
  let totalIssuedPackets = 0;
  let totalIssuedLitres = 0;
  let totalReturnedPackets = 0;
  let totalReturnedLitres = 0;
  let totalDamagedPackets = 0;
  let totalDamagedLitres = 0;
  let totalBalancePackets = 0;
  let totalBalanceLitres = 0;

  const rows = products.map((product) => {
    const period = productActivity[product.id] ?? emptyPeriod();
    const openingPackets =
      product.depotPackets -
      period.receivedPackets +
      period.issuedPackets -
      period.returnedPackets;
    const opening =
      product.depot - period.received + period.issued - period.returned;

    totalOpeningPackets += openingPackets;
    totalOpeningLitres += opening;
    totalReceivedPackets += period.receivedPackets;
    totalReceivedLitres += period.received;
    totalIssuedPackets += period.issuedPackets;
    totalIssuedLitres += period.issued;
    totalReturnedPackets += period.returnedPackets;
    totalReturnedLitres += period.returned;
    totalDamagedPackets += period.damagedPackets;
    totalDamagedLitres += period.damaged;
    totalBalancePackets += product.depotPackets;
    totalBalanceLitres += product.depot;

    return { product, period, openingPackets, opening };
  });

  return (
    <>
      <TableHeader>
        <TableRow>
          <TableHead>Oil type</TableHead>
          <TableHead className="min-w-[4.5rem]">Opening</TableHead>
          <TableHead className="min-w-[4.5rem]">Received</TableHead>
          <TableHead className="min-w-[4.5rem]">Issued</TableHead>
          <TableHead className="min-w-[4.5rem]">Returned</TableHead>
          <TableHead className="min-w-[4.5rem]">Damaged</TableHead>
          <TableHead className="min-w-[4.5rem]">Balance</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ product, period, openingPackets, opening }) => (
          <TableRow key={product.id}>
            <TableCell className="font-medium">{product.name}</TableCell>
            <TableCell>
              <StockAmount packets={openingPackets} litres={opening} unit={unit} />
            </TableCell>
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
                packets={period.returnedPackets}
                litres={period.returned}
                unit={unit}
              />
            </TableCell>
            <TableCell>
              <StockAmount
                packets={period.damagedPackets}
                litres={period.damaged}
                unit={unit}
                destructive
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
              packets={totalOpeningPackets}
              litres={totalOpeningLitres}
              unit={unit}
            />
          </TableCell>
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
              packets={totalReturnedPackets}
              litres={totalReturnedLitres}
              unit={unit}
            />
          </TableCell>
          <TableCell>
            <StockAmount
              packets={totalDamagedPackets}
              litres={totalDamagedLitres}
              unit={unit}
              destructive
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
  let totalOpeningPackets = 0;
  let totalOpeningLitres = 0;
  let totalIssuedPackets = 0;
  let totalIssuedLitres = 0;
  let totalSoldPackets = 0;
  let totalSoldLitres = 0;
  let totalDamagedPackets = 0;
  let totalDamagedLitres = 0;
  let totalReturnedPackets = 0;
  let totalReturnedLitres = 0;
  let totalBalancePackets = 0;
  let totalBalanceLitres = 0;

  const rows = products.map((product) => {
    const period = productActivity[product.id] ?? emptyPeriod();
    const soldPackets = period.consumedPackets - period.damagedPackets;
    const sold = period.consumed - period.damaged;
    const openingPackets =
      product.managerPackets -
      period.issuedPackets +
      soldPackets +
      period.damagedPackets +
      period.returnedPackets;
    const opening =
      product.manager -
      period.issued +
      sold +
      period.damaged +
      period.returned;

    totalOpeningPackets += openingPackets;
    totalOpeningLitres += opening;
    totalIssuedPackets += period.issuedPackets;
    totalIssuedLitres += period.issued;
    totalSoldPackets += soldPackets;
    totalSoldLitres += sold;
    totalDamagedPackets += period.damagedPackets;
    totalDamagedLitres += period.damaged;
    totalReturnedPackets += period.returnedPackets;
    totalReturnedLitres += period.returned;
    totalBalancePackets += product.managerPackets;
    totalBalanceLitres += product.manager;

    return { product, period, openingPackets, opening, soldPackets, sold };
  });

  return (
    <>
      <TableHeader>
        <TableRow>
          <TableHead>Oil type</TableHead>
          <TableHead className="min-w-[4.5rem]">Opening</TableHead>
          <TableHead className="min-w-[4.5rem]">Issued</TableHead>
          <TableHead className="min-w-[4.5rem]">Sold</TableHead>
          <TableHead className="min-w-[4.5rem]">Damaged</TableHead>
          <TableHead className="min-w-[4.5rem]">Returned</TableHead>
          <TableHead className="min-w-[4.5rem]">Balance</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ product, period, openingPackets, opening, soldPackets, sold }) => (
          <TableRow key={product.id}>
            <TableCell className="font-medium">{product.name}</TableCell>
            <TableCell>
              <StockAmount packets={openingPackets} litres={opening} unit={unit} />
            </TableCell>
            <TableCell>
              <StockAmount
                packets={period.issuedPackets}
                litres={period.issued}
                unit={unit}
              />
            </TableCell>
            <TableCell>
              <StockAmount packets={soldPackets} litres={sold} unit={unit} />
            </TableCell>
            <TableCell>
              <StockAmount
                packets={period.damagedPackets}
                litres={period.damaged}
                unit={unit}
                destructive
              />
            </TableCell>
            <TableCell>
              <StockAmount
                packets={period.returnedPackets}
                litres={period.returned}
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
              packets={totalOpeningPackets}
              litres={totalOpeningLitres}
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
              packets={totalSoldPackets}
              litres={totalSoldLitres}
              unit={unit}
            />
          </TableCell>
          <TableCell>
            <StockAmount
              packets={totalDamagedPackets}
              litres={totalDamagedLitres}
              unit={unit}
              destructive
            />
          </TableCell>
          <TableCell>
            <StockAmount
              packets={totalReturnedPackets}
              litres={totalReturnedLitres}
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
