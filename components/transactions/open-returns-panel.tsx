"use client";

import { useState } from "react";
import type { OpenReturnedCaseRow } from "@/lib/queries/returned-cases";
import { formatDateTime } from "@/lib/format";
import { formatPacketSizeLabel } from "@/lib/products/display";
import { MarkReturnedReplacedDialog } from "@/components/transactions/mark-returned-replaced-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function OpenReturnsPanel({
  rows,
  canWrite,
}: {
  rows: OpenReturnedCaseRow[];
  canWrite: boolean;
}) {
  const [selected, setSelected] = useState<OpenReturnedCaseRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (rows.length === 0) return null;

  return (
    <>
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Open returns
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({rows.length})
            </span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Returned cases waiting for replacement. You can replace some now and
            the rest later.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Recorded</TableHead>
                  <TableHead>Dealer</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Oil Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Open / returned</TableHead>
                  {canWrite ? <TableHead>Actions</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(row.createdAt)}
                    </TableCell>
                    <TableCell>{row.dealerSource}</TableCell>
                    <TableCell className="max-w-[8rem] truncate">
                      {row.invoice}
                    </TableCell>
                    <TableCell className="font-medium">
                      {row.productName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatPacketSizeLabel(row.product) ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{row.casesPending}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        / {row.casesReturned}
                      </span>
                      {row.casesReplaced > 0 ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({row.casesReplaced} replaced)
                        </span>
                      ) : null}
                    </TableCell>
                    {canWrite ? (
                      <TableCell>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelected(row);
                            setDialogOpen(true);
                          }}
                        >
                          Mark replaced
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <MarkReturnedReplacedDialog
        row={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
