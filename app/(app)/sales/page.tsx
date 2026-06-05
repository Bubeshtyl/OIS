import { SaleForm } from "@/components/forms/sale-form";
import { PageHeader } from "@/components/shared/page-blocks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatDate,
  formatInr,
  formatPackets,
  formatTransactionQuantity,
} from "@/lib/format";
import { parsePackageCountFromNote } from "@/lib/packaging";
import {
  getActiveProducts,
  getTodaySales,
} from "@/lib/queries/inventory";
import { getIstTodayString } from "@/lib/timezone";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const today = getIstTodayString();
  const [products, todaySales] = await Promise.all([
    getActiveProducts(),
    getTodaySales(today),
  ]);

  let totalPackets = 0;
  let totalValue = 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Sales"
        subtitle="Oil Manager → Sold (no customer data)"
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Record Sale</CardTitle>
        </CardHeader>
        <CardContent>
          <SaleForm products={products} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Today&apos;s Sales · {formatDate(today)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todaySales.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No sales recorded today.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Packets</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todaySales.map((row, i) => {
                  const qty = Number(row.quantity);
                  const value = qty * Number(row.sellingPrice);
                  const packageCount = parsePackageCountFromNote(row.referenceNote);
                  const packetCount =
                    packageCount ??
                    (row.volumePerPacket
                      ? Math.round(qty / Number(row.volumePerPacket))
                      : 0);
                  totalPackets += packetCount;
                  totalValue += value;
                  return (
                    <TableRow key={`${row.productName}-${i}`}>
                      <TableCell>{row.productName}</TableCell>
                      <TableCell>
                        {packageCount != null ? packageCount : "—"}
                      </TableCell>
                      <TableCell>
                        {formatTransactionQuantity(
                          "SALE",
                          row.quantity,
                          row.referenceNote,
                          row,
                          row.unit
                        )}
                      </TableCell>
                      <TableCell>{formatInr(value)}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="font-semibold">
                  <TableCell>Total today</TableCell>
                  <TableCell />
                  <TableCell>{formatPackets(totalPackets)}</TableCell>
                  <TableCell>{formatInr(totalValue)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
