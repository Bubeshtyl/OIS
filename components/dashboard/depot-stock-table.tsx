import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatStockCell } from "@/lib/format";

type ProductRow = {
  id: string;
  name: string;
  depot: number;
  depotPackets: number;
};

type PeriodRow = {
  received: number;
  issued: number;
  receivedPackets: number;
  issuedPackets: number;
};

function StockAmount({
  packets,
  litres,
  emphasize = false,
}: {
  packets: number;
  litres: number;
  emphasize?: boolean;
}) {
  const { primary, secondary } = formatStockCell(packets, litres);

  return (
    <div>
      <p className={emphasize ? "font-semibold text-emerald-700" : "font-medium"}>
        {primary}
      </p>
      {secondary ? (
        <p className="text-xs text-muted-foreground">{secondary}</p>
      ) : null}
    </div>
  );
}

export function DepotStockTable({
  products,
  productActivity,
}: {
  products: ProductRow[];
  productActivity: Map<string, PeriodRow>;
}) {
  let totalReceivedPackets = 0;
  let totalReceivedLitres = 0;
  let totalIssuedPackets = 0;
  let totalIssuedLitres = 0;
  let totalBalancePackets = 0;
  let totalBalanceLitres = 0;

  const rows = products.map((product) => {
    const period = productActivity.get(product.id) ?? {
      received: 0,
      issued: 0,
      receivedPackets: 0,
      issuedPackets: 0,
    };

    totalReceivedPackets += period.receivedPackets;
    totalReceivedLitres += period.received;
    totalIssuedPackets += period.issuedPackets;
    totalIssuedLitres += period.issued;
    totalBalancePackets += product.depotPackets;
    totalBalanceLitres += product.depot;

    return { product, period };
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Oil type</TableHead>
          <TableHead>Received</TableHead>
          <TableHead>Issued</TableHead>
          <TableHead>Balance</TableHead>
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
              />
            </TableCell>
            <TableCell>
              <StockAmount
                packets={period.issuedPackets}
                litres={period.issued}
              />
            </TableCell>
            <TableCell>
              <StockAmount
                packets={product.depotPackets}
                litres={product.depot}
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
            />
          </TableCell>
          <TableCell>
            <StockAmount
              packets={totalIssuedPackets}
              litres={totalIssuedLitres}
            />
          </TableCell>
          <TableCell>
            <StockAmount
              packets={totalBalancePackets}
              litres={totalBalanceLitres}
              emphasize
            />
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
