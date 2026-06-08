"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PackageCountField } from "@/components/forms/package-count-field";
import { VolumeUnitToggle } from "@/components/forms/volume-unit-toggle";
import type { OilProduct } from "@/lib/db/schema";
import { formatLitres, formatStockAvailability } from "@/lib/format";
import { getIstTodayString } from "@/lib/timezone";
import {
  getManagerBalanceAction,
  recordSaleAction,
  type ActionState,
} from "@/lib/actions/inventory";
import {
  getVolumePerPacketLitres,
  hasPacketPackaging,
  litresFromPackets,
  maxPacketsFromLitres,
} from "@/lib/packaging";
import {
  convertDisplayQuantity,
  defaultVolumeUnit,
  isVolumeProduct,
  maxDisplayQuantity,
  toLitres,
  type VolumeUnit,
} from "@/lib/volume-units";

const initialState: ActionState = { success: false };

export function SaleForm({
  products,
  onSuccess,
}: {
  products: OilProduct[];
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    recordSaleAction,
    initialState
  );
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [managerBalance, setManagerBalance] = useState(0);
  const [consumptionType, setConsumptionType] = useState<
    "SALE" | "RETURNED" | "DAMAGED"
  >("SALE");
  const [oilQty, setOilQty] = useState("");
  const [packetCount, setPacketCount] = useState("");
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>("litre");
  const today = getIstTodayString();
  const [transactionDate, setTransactionDate] = useState(today);
  const qtyRef = useRef<HTMLInputElement>(null);

  const selectedProduct = products.find((p) => p.id === productId);
  const usesVolumeUnits = isVolumeProduct(selectedProduct?.unit ?? "litre");
  const unit = selectedProduct?.unit ?? "litre";
  const usesPacketPackaging = hasPacketPackaging(selectedProduct);

  const quantityInLitres = useMemo(() => {
    if (usesPacketPackaging && selectedProduct) {
      const packets = Number(packetCount);
      const litres = litresFromPackets(packets, selectedProduct);
      return litres != null ? String(litres) : "";
    }
    return usesVolumeUnits ? toLitres(oilQty, volumeUnit) : oilQty;
  }, [
    oilQty,
    packetCount,
    selectedProduct,
    usesPacketPackaging,
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
    if (!productId) return;
    getManagerBalanceAction(productId).then(setManagerBalance);
    if (!usesPacketPackaging) {
      qtyRef.current?.focus();
    }
  }, [productId, state, usesPacketPackaging]);

  useEffect(() => {
    setOilQty("");
    setPacketCount("");
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

  const perPacket = selectedProduct
    ? getVolumePerPacketLitres(selectedProduct)
    : null;

  const isReturned = consumptionType === "RETURNED";
  const hasManagerStock = managerBalance > 0;

  const volumeMax = usesVolumeUnits
    ? hasManagerStock
      ? maxDisplayQuantity(managerBalance, volumeUnit)
      : undefined
    : undefined;

  const packetMax =
    usesPacketPackaging && selectedProduct && hasManagerStock
      ? maxPacketsFromLitres(managerBalance, selectedProduct) ?? undefined
      : undefined;

  const quantityNum = quantityInLitres ? Number(quantityInLitres) : 0;
  const exceedsManagerStock =
    hasManagerStock && quantityNum > managerBalance;
  const blockedByNoStock = !hasManagerStock;

  const submitLabel =
    consumptionType === "SALE"
      ? "Record Sale"
      : consumptionType === "RETURNED"
        ? "Record Return"
        : "Record Damage";

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="productId" value={productId} />
      <input
        type="hidden"
        name="consumptionType"
        value={consumptionType}
      />
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
      <div className="space-y-2">
        <Label htmlFor="consumptionType">Category *</Label>
        <Select
          value={consumptionType}
          onValueChange={(value) =>
            value &&
            setConsumptionType(value as "SALE" | "RETURNED" | "DAMAGED")
          }
        >
          <SelectTrigger className="min-h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SALE" disabled={!hasManagerStock}>
              Sale
            </SelectItem>
            <SelectItem value="RETURNED" disabled={!hasManagerStock}>
              Returned
            </SelectItem>
            <SelectItem value="DAMAGED" disabled={!hasManagerStock}>
              Damaged
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      {productId && (
        <Badge variant="secondary" className="w-full justify-center py-2">
          {hasManagerStock ? (
            <>
              Available at Manager:{" "}
              {formatStockAvailability(managerBalance, selectedProduct)}
              {isReturned ? " · returns to Depot" : null}
            </>
          ) : (
            "No stock at Oil Manager — issue stock before recording consumption"
          )}
        </Badge>
      )}

      {usesPacketPackaging ? (
        <>
          <PackageCountField
            label="Packets"
            description={
              isReturned
                ? "Number of pouches or sachets returned to Depot"
                : "Number of pouches or sachets sold"
            }
            value={packetCount}
            onChange={setPacketCount}
            max={packetMax}
          />
          {perPacket != null ? (
            <p className="text-xs text-muted-foreground">
              {perPacket < 1
                ? `${Math.round(perPacket * 1000)} ml`
                : `${perPacket} L`}{" "}
              per packet
            </p>
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
              <Label htmlFor="quantity">Quantity *</Label>
              {usesVolumeUnits ? (
                <VolumeUnitToggle
                  volumeUnit={volumeUnit}
                  onChange={handleUnitChange}
                />
              ) : (
                <Badge variant="secondary" className="px-3 text-sm">
                  {unit}
                </Badge>
              )}
            </div>
            <Input
              ref={qtyRef}
              id="quantity"
              type="number"
              step={volumeStep}
              min={volumeMin}
              max={volumeMax}
              required
              className="min-h-12 text-lg"
              value={oilQty}
              onChange={(e) => setOilQty(e.target.value)}
            />
          </div>
          <PackageCountField
            label="Packets"
            description="Number of pouches or sachets sold"
          />
        </>
      )}

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
        <Label htmlFor="referenceNote">Note (optional)</Label>
        <Textarea id="referenceNote" name="referenceNote" rows={2} />
      </div>
      <Button
        type="submit"
        disabled={
          pending ||
          !productId ||
          !quantityInLitres ||
          blockedByNoStock ||
          exceedsManagerStock
        }
        className="w-full"
      >
        {pending ? "Recording..." : submitLabel}
      </Button>
    </form>
  );
}
