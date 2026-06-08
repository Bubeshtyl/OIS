import type { StockSummaryReportRow } from "@/lib/queries/reports";
import { ReportQuantityCell } from "@/components/reports/report-preview";
import type { StockDisplayUnit } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type StockSummaryTotals = {
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

export function StockSummaryTable({
  rows,
  totals,
  unit = "packets",
}: {
  rows: StockSummaryReportRow[];
  totals: StockSummaryTotals;
  unit?: StockDisplayUnit;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead>Oil Type</TableHead>
          <TableHead className="min-w-[4.5rem]">Opening</TableHead>
          <TableHead className="min-w-[4.5rem]">Received</TableHead>
          <TableHead className="min-w-[4.5rem]">Issued</TableHead>
          <TableHead className="min-w-[4.5rem]">Returned</TableHead>
          <TableHead className="min-w-[4.5rem]">Sold</TableHead>
          <TableHead className="min-w-[4.5rem]">Damaged</TableHead>
          <TableHead className="min-w-[4.5rem]">Balance</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.productId}>
            <TableCell className="font-medium">{row.name}</TableCell>
            <TableCell>
              <ReportQuantityCell
                packets={row.openingPackets}
                litres={row.opening}
                unit={unit}
              />
            </TableCell>
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
                packets={row.returnedPackets}
                litres={row.returned}
                unit={unit}
              />
            </TableCell>
            <TableCell>
              <ReportQuantityCell
                packets={row.soldPackets}
                litres={row.sold}
                unit={unit}
              />
            </TableCell>
            <TableCell>
              <ReportQuantityCell
                packets={row.damagedPackets}
                litres={row.damaged}
                unit={unit}
                destructive
              />
            </TableCell>
            <TableCell>
              <ReportQuantityCell
                packets={row.balancePackets}
                litres={row.balance}
                unit={unit}
                emphasize
              />
            </TableCell>
          </TableRow>
        ))}
        <TableRow className="border-t-2 font-semibold hover:bg-transparent">
          <TableCell>Total</TableCell>
          <TableCell>
            <ReportQuantityCell
              packets={totals.openingPackets}
              litres={totals.opening}
              unit={unit}
              emphasize
            />
          </TableCell>
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
              packets={totals.returnedPackets}
              litres={totals.returned}
              unit={unit}
              emphasize
            />
          </TableCell>
          <TableCell>
            <ReportQuantityCell
              packets={totals.soldPackets}
              litres={totals.sold}
              unit={unit}
              emphasize
            />
          </TableCell>
          <TableCell>
            <ReportQuantityCell
              packets={totals.damagedPackets}
              litres={totals.damaged}
              unit={unit}
              emphasize
              destructive
            />
          </TableCell>
          <TableCell>
            <ReportQuantityCell
              packets={totals.balancePackets}
              litres={totals.balance}
              unit={unit}
              emphasize
            />
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
