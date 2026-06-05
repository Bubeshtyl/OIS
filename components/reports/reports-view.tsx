"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { formatDate, formatInr, formatQuantity } from "@/lib/format";
import { LedgerTable } from "@/components/reports/ledger-table";
import { PageHeader } from "@/components/shared/page-blocks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type StockRow = {
  name: string;
  unit: string;
  depot: number;
  manager: number;
  costPrice: number;
  sellingPrice: number;
};

type LedgerRow = {
  id: string;
  type: "RECEIVE" | "TRANSFER" | "SALE" | "REVERSAL";
  productName: string;
  unit: string;
  quantity: string;
  transactionDate: string;
  referenceNote?: string | null;
  reversesTransactionId?: string | null;
};

type SummaryRow = {
  date: string;
  received: number;
  transferred: number;
  sold: number;
};

export function ReportsView({
  stockProducts,
  ledger,
  summary,
  sales,
  reversedIds,
  isAdmin,
  defaultTab,
}: {
  stockProducts: StockRow[];
  ledger: LedgerRow[];
  summary: SummaryRow[];
  sales: LedgerRow[];
  reversedIds: string[];
  isAdmin: boolean;
  defaultTab: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startDate = searchParams.get("start") ?? "";
  const endDate = searchParams.get("end") ?? "";

  const applyRange = (formData: FormData) => {
    const start = String(formData.get("start"));
    const end = String(formData.get("end"));
    const tab = searchParams.get("tab") ?? defaultTab;
    router.push(`/reports?tab=${tab}&start=${start}&end=${end}`);
  };

  let depotTotal = 0;
  let managerTotal = 0;
  let valueTotal = 0;

  return (
    <div>
      <PageHeader title="Reports" />
      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
          <TabsTrigger value="summary">Daily Summary</TabsTrigger>
          <TabsTrigger value="ledger">Full Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <Card>
            <CardHeader>
              <CardTitle>Current Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Depot</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockProducts.map((p) => {
                    depotTotal += p.depot;
                    managerTotal += p.manager;
                    const value =
                      (p.depot + p.manager) * p.costPrice;
                    valueTotal += value;
                    return (
                      <TableRow key={p.name}>
                        <TableCell>{p.name}</TableCell>
                        <TableCell>
                          {formatQuantity(p.depot, p.unit)}
                        </TableCell>
                        <TableCell>
                          {formatQuantity(p.manager, p.unit)}
                        </TableCell>
                        <TableCell>{formatInr(value)}</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="font-semibold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell>
                      {depotTotal.toFixed(1)} L
                    </TableCell>
                    <TableCell>
                      {managerTotal.toFixed(1)} L
                    </TableCell>
                    <TableCell>{formatInr(valueTotal)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales">
          <DateFilter
            startDate={startDate}
            endDate={endDate}
            onSubmit={applyRange}
          />
          <Card>
            <CardContent className="pt-6">
              <LedgerTable
                rows={sales}
                reversedIds={new Set(reversedIds)}
                isAdmin={false}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipts">
          <Card>
            <CardContent className="pt-6">
              <LedgerTable
                rows={ledger.filter((r) => r.type === "RECEIVE")}
                reversedIds={new Set(reversedIds)}
                isAdmin={false}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers">
          <Card>
            <CardContent className="pt-6">
              <LedgerTable
                rows={ledger.filter((r) => r.type === "TRANSFER")}
                reversedIds={new Set(reversedIds)}
                isAdmin={false}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary">
          <DateFilter
            startDate={startDate}
            endDate={endDate}
            onSubmit={applyRange}
          />
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Transferred</TableHead>
                    <TableHead>Sold</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.map((row) => (
                    <TableRow key={row.date}>
                      <TableCell>{formatDate(row.date)}</TableCell>
                      <TableCell>{row.received.toFixed(1)} L</TableCell>
                      <TableCell>{row.transferred.toFixed(1)} L</TableCell>
                      <TableCell>{row.sold.toFixed(1)} L</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger">
          <Card>
            <CardContent className="pt-6">
              <LedgerTable
                rows={ledger}
                reversedIds={new Set(reversedIds)}
                isAdmin={isAdmin}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DateFilter({
  startDate,
  endDate,
  onSubmit,
}: {
  startDate: string;
  endDate: string;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <form action={onSubmit} className="mb-4 flex flex-wrap items-end gap-2">
      <div>
        <label className="text-xs text-muted-foreground">From</label>
        <Input name="start" type="date" defaultValue={startDate} className="min-h-11" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">To</label>
        <Input name="end" type="date" defaultValue={endDate} className="min-h-11" />
      </div>
      <Button type="submit" className="min-h-11">
        Go
      </Button>
    </form>
  );
}
