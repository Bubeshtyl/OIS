"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OilProduct } from "@/lib/db/schema";
import { formatLitres } from "@/lib/format";
import { getIstTodayString } from "@/lib/timezone";
import { PackageCountField } from "@/components/forms/package-count-field";
import { VolumeUnitToggle } from "@/components/forms/volume-unit-toggle";
import {
  receiveStockAction,
  type ActionState,
} from "@/lib/actions/inventory";
import {
  describeBoxPackaging,
  hasBoxPackaging,
  litresFromBoxes,
} from "@/lib/packaging";
import {
  convertDisplayQuantity,
  defaultVolumeUnit,
  isVolumeProduct,
  toLitres,
  type VolumeUnit,
} from "@/lib/volume-units";

const initialState: ActionState = { success: false };

export function ReceiveForm({
  products,
  onSuccess,
}: {
  products: OilProduct[];
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    receiveStockAction,
    initialState
  );
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [oilQty, setOilQty] = useState("");
  const [boxCount, setBoxCount] = useState("");
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>("litre");
  const today = getIstTodayString();
  const [transactionDate, setTransactionDate] = useState(today);

  const selectedProduct = products.find((p) => p.id === productId);
  const unit = selectedProduct?.unit ?? "litre";
  const usesVolumeUnits = isVolumeProduct(unit);
  const usesBoxPackaging = hasBoxPackaging(selectedProduct);

  const quantityInLitres = useMemo(() => {
    if (usesBoxPackaging && selectedProduct) {
      const boxes = Number(boxCount);
      const litres = litresFromBoxes(boxes, selectedProduct);
      return litres != null ? String(litres) : "";
    }
    return usesVolumeUnits ? toLitres(oilQty, volumeUnit) : oilQty;
  }, [
    boxCount,
    oilQty,
    selectedProduct,
    usesBoxPackaging,
    usesVolumeUnits,
    volumeUnit,
  ]);

  useEffect(() => {
    if (state.success) {
      if (state.message) toast.success(state.message);
      onSuccess?.();
    }
    if (state.error) toast.error(state.error);
  }, [state, onSuccess]);

  useEffect(() => {
    setOilQty("");
    setBoxCount("");
    setVolumeUnit(defaultVolumeUnit(unit));
  }, [productId, unit]);

  function handleUnitChange(nextUnit: VolumeUnit) {
    if (nextUnit === volumeUnit) return;
    setOilQty((current) => convertDisplayQuantity(current, volumeUnit, nextUnit));
    setVolumeUnit(nextUnit);
  }

  const volumeStep =
    usesVolumeUnits && volumeUnit === "ml" ? "1" : "0.001";
  const volumeMin =
    usesVolumeUnits && volumeUnit === "ml" ? "1" : "0.001";
  const volumePlaceholder =
    usesVolumeUnits && volumeUnit === "ml" ? "5000" : "50";

  const packagingHint = selectedProduct
    ? describeBoxPackaging(selectedProduct)
    : null;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="quantity" value={quantityInLitres} />
      <div className="space-y-2">
        <Label htmlFor="product">Product *</Label>
        <Select
          value={productId}
          onValueChange={(value) => value && setProductId(value)}
          items={products.map((p) => ({ value: p.id, label: p.name }))}
        >
          <SelectTrigger className="min-h-11 w-full">
            <SelectValue placeholder="Select oil..." />
          </SelectTrigger>
          <SelectContent>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {usesBoxPackaging ? (
        <>
          <PackageCountField
            label="Boxes"
            description="Number of boxes or cartons received"
            value={boxCount}
            onChange={setBoxCount}
          />
          {packagingHint ? (
            <p className="text-xs text-muted-foreground">{packagingHint}</p>
          ) : null}
          {quantityInLitres ? (
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
              Total volume:{" "}
              <span className="font-semibold">
                {formatLitres(quantityInLitres)}
              </span>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label htmlFor="oilQuantity">Oil Quantity *</Label>
                <p className="text-xs text-muted-foreground">
                  Total volume of oil received
                </p>
              </div>
              {usesVolumeUnits ? (
                <VolumeUnitToggle
                  volumeUnit={volumeUnit}
                  onChange={handleUnitChange}
                />
              ) : (
                <Badge variant="secondary" className="px-3 text-sm">
                  {selectedProduct?.unit ?? "litre"}
                </Badge>
              )}
            </div>
            <Input
              id="oilQuantity"
              type="number"
              step={volumeStep}
              min={volumeMin}
              required
              className="min-h-11"
              placeholder={volumePlaceholder}
              value={oilQty}
              onChange={(e) => setOilQty(e.target.value)}
            />
          </div>
          <PackageCountField
            label="Boxes"
            description="Number of boxes or cartons received"
            value={boxCount}
            onChange={setBoxCount}
          />
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="supplier">Supplier</Label>
        <Input
          id="supplier"
          name="supplier"
          placeholder="Supplier name"
          className="min-h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="transactionDate">Date *</Label>
        <DatePicker
          id="transactionDate"
          name="transactionDate"
          value={transactionDate}
          onChange={setTransactionDate}
          today={today}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="invoice">Invoice No.</Label>
        <Input
          id="invoice"
          name="invoice"
          placeholder="INV-2041"
          className="min-h-11"
        />
      </div>
      <Button
        type="submit"
        disabled={pending || !productId || !quantityInLitres || !boxCount}
        className="w-full"
      >
        {pending ? "Recording..." : "Record Receipt"}
      </Button>
    </form>
  );
}
