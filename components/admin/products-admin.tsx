"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { OilProduct } from "@/lib/db/schema";
import { saveProductAction } from "@/lib/actions/admin";
import type { ActionState } from "@/lib/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatInr, formatLitres } from "@/lib/format";
import { describeBoxPackaging } from "@/lib/packaging";
import { VolumeUnitToggle } from "@/components/forms/volume-unit-toggle";
import {
  convertDisplayQuantity,
  productUnitFromVolumeUnit,
  toLitres,
  type VolumeUnit,
} from "@/lib/volume-units";

const initialState: ActionState = { success: false };

// Product unit is derived from the volume-per-packet L/mL toggle (hidden field).
function ProductFormSheet({
  product,
  children,
  onSaved,
}: {
  product?: OilProduct;
  children: React.ReactElement;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    saveProductAction,
    initialState
  );
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [packetVolume, setPacketVolume] = useState(() => {
    if (!product?.volumePerPacket) return "";
    const litres = Number(product.volumePerPacket);
    return litres < 1 ? String(Math.round(litres * 1000)) : String(litres);
  });
  const [packetVolumeUnit, setPacketVolumeUnit] = useState<VolumeUnit>(() => {
    if (!product?.volumePerPacket) return "ml";
    return Number(product.volumePerPacket) < 1 ? "ml" : "litre";
  });

  const [packetsPerBox, setPacketsPerBox] = useState(
    product?.packetsPerBox ?? ""
  );

  const unit = productUnitFromVolumeUnit(packetVolumeUnit);
  const volumePerPacketLitres = toLitres(packetVolume, packetVolumeUnit);
  const boxSizeLitres =
    packetsPerBox && volumePerPacketLitres
      ? Number(packetsPerBox) * Number(volumePerPacketLitres)
      : null;

  function handlePacketUnitChange(nextUnit: VolumeUnit) {
    if (nextUnit === packetVolumeUnit) return;
    setPacketVolume((current) =>
      convertDisplayQuantity(current, packetVolumeUnit, nextUnit)
    );
    setPacketVolumeUnit(nextUnit);
  }

  function resetFormFromProduct() {
    setIsActive(product?.isActive ?? true);
    setPacketsPerBox(product?.packetsPerBox ?? "");

    if (product?.volumePerPacket) {
      const litres = Number(product.volumePerPacket);
      if (litres < 1) {
        setPacketVolume(String(Math.round(litres * 1000)));
        setPacketVolumeUnit("ml");
      } else {
        setPacketVolume(String(litres));
        setPacketVolumeUnit("litre");
      }
    } else {
      setPacketVolume("");
      setPacketVolumeUnit("ml");
    }
  }

  useEffect(() => {
    if (open) {
      resetFormFromProduct();
    }
  }, [open, product]);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      setOpen(false);
      router.refresh();
      onSaved?.();
    }
    if (state.error) toast.error(state.error);
  }, [state, onSaved, router]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          resetFormFromProduct();
        }
      }}
    >
      <DialogTrigger render={children} />
      <DialogContent className="max-h-[min(90vh,32rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "Add Product"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          {product && <input type="hidden" name="id" value={product.id} />}
          <input type="hidden" name="isActive" value={String(isActive)} />
          <input type="hidden" name="unit" value={unit} />
          <input
            type="hidden"
            name="volumePerPacket"
            value={volumePerPacketLitres}
          />
          <div className="space-y-2">
            <Label htmlFor="name">Product name *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={product?.name}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="packetsPerBox">Packets per box</Label>
            <p className="text-xs text-muted-foreground">
              How many pouches or sachets are in one box or carton.
            </p>
            <Input
              id="packetsPerBox"
              name="packetsPerBox"
              type="number"
              step="1"
              min="1"
              value={packetsPerBox}
              onChange={(e) => setPacketsPerBox(e.target.value)}
              placeholder="5"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label htmlFor="packetVolume">Volume per packet</Label>
                <p className="text-xs text-muted-foreground">
                  Size of one pouch or sachet inside a box.
                </p>
              </div>
              <VolumeUnitToggle
                volumeUnit={packetVolumeUnit}
                onChange={handlePacketUnitChange}
              />
            </div>
            <Input
              id="packetVolume"
              type="number"
              step={packetVolumeUnit === "ml" ? "1" : "0.001"}
              min={packetVolumeUnit === "ml" ? "1" : "0.001"}
              value={packetVolume}
              onChange={(e) => setPacketVolume(e.target.value)}
              placeholder={packetVolumeUnit === "ml" ? "500" : "0.5"}
            />
            {boxSizeLitres ? (
              <p className="text-xs text-muted-foreground">
                Box size: {formatLitres(boxSizeLitres)}
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="costPrice">Cost price *</Label>
              <Input
                id="costPrice"
                name="costPrice"
                type="number"
                step="0.01"
                defaultValue={product?.costPrice}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sellingPrice">Selling price *</Label>
              <Input
                id="sellingPrice"
                name="sellingPrice"
                type="number"
                step="0.01"
                defaultValue={product?.sellingPrice}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lowStockThreshold">Low stock alert</Label>
            <p className="text-xs text-muted-foreground">
              Warn when manager stock drops to or below this amount (litres).
              Only products issued to the manager are checked. Leave blank to
              disable.
            </p>
            <Input
              id="lowStockThreshold"
              name="lowStockThreshold"
              type="number"
              step="0.001"
              defaultValue={product?.lowStockThreshold ?? ""}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="active">Active</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="flex-1">
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProductsAdmin({ products }: { products: OilProduct[] }) {
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <ProductFormSheet>
          <Button className="min-h-11">
            + Add
          </Button>
        </ProductFormSheet>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>In box</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Prices</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            const boxLabel = describeBoxPackaging(product);

            return (
            <TableRow key={product.id}>
              <TableCell>{product.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {boxLabel ?? "—"}
              </TableCell>
              <TableCell>{product.unit}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatInr(product.costPrice)} / {formatInr(product.sellingPrice)}
              </TableCell>
              <TableCell>
                {product.isActive ? "Active" : "Inactive"}
              </TableCell>
              <TableCell>
                <ProductFormSheet
                  key={`${product.id}-${product.packetsPerBox}-${product.volumePerPacket}`}
                  product={product}
                >
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </ProductFormSheet>
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
