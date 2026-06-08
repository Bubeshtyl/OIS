import { formatInr, formatStockQuantity, type StockDisplayUnit } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type StockCountRow = {
  id: string;
  name: string;
  depot: number;
  manager: number;
  depotPackets: number;
  managerPackets: number;
  costPrice: number;
  isLowStock: boolean;
};

export function StockCountTable({
  rows,
  location,
  unit = "packets",
}: {
  rows: StockCountRow[];
  location: "all" | "depot" | "manager";
  unit?: StockDisplayUnit;
}) {
  const showDepot = location !== "manager";
  const showManager = location !== "depot";

  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No stock matches your filters.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead>Oil Type</TableHead>
          {showDepot && <TableHead className="min-w-[4.5rem]">Depot</TableHead>}
          {showManager && (
            <TableHead className="min-w-[4.5rem]">Manager</TableHead>
          )}
          {location === "all" && (
            <TableHead className="min-w-[4.5rem]">Total</TableHead>
          )}
          <TableHead>Value</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const totalLitres = row.depot + row.manager;
          const totalPackets = row.depotPackets + row.managerPackets;
          const value = totalLitres * row.costPrice;

          return (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.name}</TableCell>
              {showDepot && (
                <TableCell>
                  {formatStockQuantity(unit, row.depotPackets, row.depot)}
                </TableCell>
              )}
              {showManager && (
                <TableCell>
                  {formatStockQuantity(unit, row.managerPackets, row.manager)}
                </TableCell>
              )}
              {location === "all" && (
                <TableCell className="font-medium">
                  {formatStockQuantity(unit, totalPackets, totalLitres)}
                </TableCell>
              )}
              <TableCell>{formatInr(value)}</TableCell>
              <TableCell>
                {row.isLowStock ? (
                  <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                    Low
                  </Badge>
                ) : (
                  <Badge variant="secondary">OK</Badge>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
