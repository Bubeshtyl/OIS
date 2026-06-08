"use client";

import { useState } from "react";
import type { OilProduct } from "@/lib/db/schema";
import type { TransactionPageKind } from "@/lib/transactions/page-config";
import { ReceiveForm } from "@/components/forms/receive-form";
import { TransferForm } from "@/components/forms/transfer-form";
import { SaleForm } from "@/components/forms/sale-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const DIALOG_TITLES: Record<TransactionPageKind, string> = {
  receive: "New Receipt",
  issued: "New Issue",
  consumption: "Record Consumption",
};

export function NewTransactionDialog({
  pageKind,
  products,
  buttonLabel,
}: {
  pageKind: TransactionPageKind;
  products: OilProduct[];
  buttonLabel: string;
}) {
  const [open, setOpen] = useState(false);

  function handleSuccess() {
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="shrink-0">{buttonLabel}</Button>
        }
      />
      <DialogContent className="max-h-[min(90vh,40rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{DIALOG_TITLES[pageKind]}</DialogTitle>
        </DialogHeader>
        {pageKind === "receive" && (
          <ReceiveForm products={products} onSuccess={handleSuccess} />
        )}
        {pageKind === "issued" && (
          <TransferForm products={products} onSuccess={handleSuccess} />
        )}
        {pageKind === "consumption" && (
          <SaleForm products={products} onSuccess={handleSuccess} />
        )}
      </DialogContent>
    </Dialog>
  );
}
