"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function SaleForm({ products }: { products: OilProduct[] }) {
  const [state, formAction, pending] = useActionState(
    recordSaleAction,
    initialState
  );
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [managerBalance, setManagerBalance] = useState(0);
  const [oilQty, setOilQty] = useState("");
  const [packetCount, setPacketCount] = useState("");
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>("litre");
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
    if (state.message) toast.success(state.message);
    if (state.error) toast.error(state.error);
  }, [state]);

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
  const volumeMax = usesVolumeUnits
    ? maxDisplayQuantity(managerBalance, volumeUnit)
    : managerBalance || undefined;

  const perPacket = selectedProduct
    ? getVolumePerPacketLitres(selectedProduct)
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
      {productId && (
        <Badge variant="secondary" className="w-full justify-center py-2">
          Available at Manager:{" "}
          {formatStockAvailability(managerBalance, selectedProduct)}
        </Badge>
      )}

      {usesPacketPackaging ? (
        <>
          <PackageCountField
            label="Packets"
            description="Number of pouches or sachets sold"
            value={packetCount}
            onChange={setPacketCount}
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
        <Input
          id="transactionDate"
          name="transactionDate"
          type="date"
          required
          defaultValue={getIstTodayString()}
          className="min-h-11"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="referenceNote">Note (optional)</Label>
        <Textarea id="referenceNote" name="referenceNote" rows={2} />
      </div>
      <Button
        type="submit"
        disabled={pending || !productId || !quantityInLitres}
        className="w-full"
      >
        {pending ? "Recording..." : "Record Sale"}
      </Button>
    </form>
  );
}
