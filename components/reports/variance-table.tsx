import type { VarianceReportRow } from "@/lib/queries/reports";
import {
  ReportQuantityCell,
  ReportVarianceCell,
} from "@/components/reports/report-preview";
import type { StockDisplayUnit } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function VarianceTable({
  rows,
  totals,
  unit = "packets",
}: {
  rows: VarianceReportRow[];
  totals: {
    received: number;
    issued: number;
    depotBalance: number;
    variance: number;
    receivedPackets: number;
    issuedPackets: number;
    depotBalancePackets: number;
    variancePackets: number;
  };
  unit?: StockDisplayUnit;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead>Oil Type</TableHead>
          <TableHead className="min-w-[4.5rem]">Received</TableHead>
          <TableHead className="min-w-[4.5rem]">Issued</TableHead>
          <TableHead className="min-w-[4.5rem]">Depot Balance</TableHead>
          <TableHead className="min-w-[4.5rem]">Variance</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.productId}>
            <TableCell className="font-medium">{row.name}</TableCell>
            <TableCell>
              <ReportQuantityCell
                packets={row.receivedPackets}
                litres={row.received}
                unit={unit}
              />
            </TableCell>
            <TableCell>
              <ReportQuantityCell
                packets={row.issuedPackets}
                litres={row.issued}
                unit={unit}
              />
            </TableCell>
            <TableCell>
              <ReportQuantityCell
                packets={row.depotBalancePackets}
                litres={row.depotBalance}
                unit={unit}
              />
            </TableCell>
            <TableCell>
              <ReportVarianceCell
                packets={row.variancePackets}
                litres={row.variance}
                unit={unit}
              />
            </TableCell>
          </TableRow>
        ))}
        <TableRow className="border-t-2 font-semibold hover:bg-transparent">
          <TableCell>Total</TableCell>
          <TableCell>
            <ReportQuantityCell
              packets={totals.receivedPackets}
              litres={totals.received}
              unit={unit}
              emphasize
            />
          </TableCell>
          <TableCell>
            <ReportQuantityCell
              packets={totals.issuedPackets}
              litres={totals.issued}
              unit={unit}
              emphasize
            />
          </TableCell>
          <TableCell>
            <ReportQuantityCell
              packets={totals.depotBalancePackets}
              litres={totals.depotBalance}
              unit={unit}
              emphasize
            />
          </TableCell>
          <TableCell>
            <ReportVarianceCell
              packets={totals.variancePackets}
              litres={totals.variance}
              unit={unit}
            />
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
