"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from "react";
import { useRouter } from "next/navigation";
import { Pencil, RotateCcw, Trash2 } from "lucide-react";
import { SearchFilterInput } from "@/components/shared/search-filter-input";
import { toast } from "sonner";
import type { OilProduct } from "@/lib/db/schema";
import {
  deactivateProductAction,
  reactivateProductAction,
  saveProductAction,
} from "@/lib/actions/admin";
import type { ActionState } from "@/lib/actions/inventory";
import { formatDefaultUnit, formatPackSizes } from "@/lib/products/display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatInr, formatLitres } from "@/lib/format";
import { VolumeUnitToggle } from "@/components/forms/volume-unit-toggle";
import {
  convertDisplayQuantity,
  productUnitFromVolumeUnit,
  toLitres,
  type VolumeUnit,
} from "@/lib/volume-units";

const initialState: ActionState = { success: false };

function ProductFormSheet({
  product,
  children,
  onSaved,
}: {
  product?: OilProduct;
  children: ReactElement;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    saveProductAction,
    initialState
  );
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
  const [mrp, setMrp] = useState(product?.costPrice ?? "");
  const [discount, setDiscount] = useState(() => {
    if (!product?.costPrice || !product?.sellingPrice) return "";
    const amount =
      Number(product.costPrice) - Number(product.sellingPrice);
    return amount > 0 ? String(amount) : "";
  });
  const [lowStockAlertEnabled, setLowStockAlertEnabled] = useState(
    () => product?.lowStockThreshold != null && product.lowStockThreshold !== ""
  );
  const [lowStockThreshold, setLowStockThreshold] = useState(
    product?.lowStockThreshold ?? ""
  );

  const sellingPrice = (() => {
    const mrpNum = Number(mrp);
    const discountNum = discount === "" ? 0 : Number(discount);
    if (mrp === "" || Number.isNaN(mrpNum) || Number.isNaN(discountNum)) {
      return "";
    }
    const result = mrpNum - discountNum;
    return result >= 0 ? result.toFixed(2) : "";
  })();

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
    setPacketsPerBox(product?.packetsPerBox ?? "");
    setMrp(product?.costPrice ?? "");
    if (product?.costPrice && product?.sellingPrice) {
      const amount =
        Number(product.costPrice) - Number(product.sellingPrice);
      setDiscount(amount > 0 ? String(amount) : "");
    } else {
      setDiscount("");
    }
    setLowStockAlertEnabled(
      product?.lowStockThreshold != null && product.lowStockThreshold !== ""
    );
    setLowStockThreshold(product?.lowStockThreshold ?? "");

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
          <input
            type="hidden"
            name="isActive"
            value={String(product?.isActive ?? true)}
          />
          <input type="hidden" name="unit" value={unit} />
          <input
            type="hidden"
            name="volumePerPacket"
            value={volumePerPacketLitres}
          />
          <input type="hidden" name="sellingPrice" value={sellingPrice} />
          <div className="space-y-2">
            <Label htmlFor="name">Oil name *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={product?.name}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label htmlFor="packetVolume">Size</Label>
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
          <div className="space-y-2">
            <Label htmlFor="packetsPerBox">Packets per box</Label>
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="costPrice">MRP *</Label>
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>₹</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  id="costPrice"
                  name="costPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value)}
                  required
                />
              </InputGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount">Discount</Label>
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>₹</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  id="discount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </InputGroup>
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="sellingPrice">Selling price</Label>
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>₹</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  id="sellingPrice"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={sellingPrice}
                  readOnly
                  tabIndex={-1}
                  className="cursor-default text-muted-foreground"
                />
              </InputGroup>
              {mrp !== "" &&
              discount !== "" &&
              Number(discount) > Number(mrp) ? (
                <p className="text-xs text-destructive">
                  Discount cannot exceed MRP.
                </p>
              ) : null}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="lowStockAlert">Low stock alert</Label>
              <Switch
                id="lowStockAlert"
                checked={lowStockAlertEnabled}
                onCheckedChange={setLowStockAlertEnabled}
              />
            </div>
            {lowStockAlertEnabled ? (
              <Input
                id="lowStockThreshold"
                name="lowStockThreshold"
                type="number"
                step="1"
                min="1"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                placeholder="Packets"
                required
              />
            ) : null}
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
            <Button
              type="submit"
              disabled={
                pending ||
                !sellingPrice ||
                (lowStockAlertEnabled && lowStockThreshold === "")
              }
              className="flex-1"
            >
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProductStatusAction({
  product,
  onComplete,
}: {
  product: OilProduct;
  onComplete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const isActive = product.isActive;

  async function handleConfirm() {
    setPending(true);
    try {
      const result = isActive
        ? await deactivateProductAction(product.id)
        : await reactivateProductAction(product.id);

      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        onComplete();
      } else {
        toast.error(result.error ?? "Something went wrong.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        title={isActive ? "Deactivate product" : "Reactivate product"}
        className={
          isActive
            ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
            : "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
        }
        disabled={pending}
        onClick={() => setOpen(true)}
      >
        {isActive ? (
          <Trash2 className="size-4" />
        ) : (
          <RotateCcw className="size-4" />
        )}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogMedia
              className={
                isActive
                  ? "bg-destructive/10 text-destructive"
                  : "bg-emerald-50 text-emerald-600"
              }
            >
              {isActive ? <Trash2 /> : <RotateCcw />}
            </AlertDialogMedia>
            <AlertDialogTitle>
              {isActive ? "Deactivate this product?" : "Reactivate this product?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isActive ? (
                <>
                  <span className="font-medium text-foreground">
                    {product.name}
                  </span>{" "}
                  will be marked inactive and hidden from receive, transfer, and
                  sales forms. Existing stock balances and transaction history
                  are kept.
                </>
              ) : (
                <>
                  <span className="font-medium text-foreground">
                    {product.name}
                  </span>{" "}
                  will be marked active again and shown in receive, transfer, and
                  sales forms.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={isActive ? "destructive" : "default"}
              disabled={pending}
              onClick={handleConfirm}
            >
              {pending
                ? "Please wait…"
                : isActive
                  ? "Deactivate"
                  : "Reactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ProductFilters({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <SearchFilterInput
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        placeholder="Search oil type…"
        className="relative min-w-[12rem] flex-1"
      />
    </div>
  );
}

export function AddProductButton() {
  return (
    <ProductFormSheet>
      <Button className="min-h-10 shrink-0">+ Add Product</Button>
    </ProductFormSheet>
  );
}

export function ProductsAdmin({
  products,
}: {
  products: OilProduct[];
}) {
  const router = useRouter();
  const [searchDraft, setSearchDraft] = useState("");

  const filteredProducts = useMemo(() => {
    const term = searchDraft.trim().toLowerCase();
    return products.filter((product) => {
      if (!term) return true;
      return (
        product.name.toLowerCase().includes(term) ||
        formatPackSizes(product).toLowerCase().includes(term)
      );
    });
  }, [products, searchDraft]);

  return (
    <Card className="border shadow-sm">
        <CardContent className="space-y-4 p-4">
          <ProductFilters
            value={searchDraft}
            onChange={setSearchDraft}
            onSubmit={() => {}}
          />

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Oil Type</TableHead>
                  <TableHead>Pack Sizes</TableHead>
                  <TableHead>Default Unit</TableHead>
                  <TableHead>MRP / Selling</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No oil products match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        {product.name}
                      </TableCell>
                      <TableCell>{formatPackSizes(product)}</TableCell>
                      <TableCell>
                        {formatDefaultUnit(product.unit)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatInr(product.costPrice)} /{" "}
                        {formatInr(product.sellingPrice)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={product.isActive ? "default" : "secondary"}
                        >
                          {product.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <ProductFormSheet
                            key={`${product.id}-${product.packetsPerBox}-${product.volumePerPacket}`}
                            product={product}
                          >
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Edit product"
                            >
                              <Pencil className="size-4" />
                            </Button>
                          </ProductFormSheet>
                          <ProductStatusAction
                            product={product}
                            onComplete={() => router.refresh()}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-sm text-muted-foreground">
            Showing {filteredProducts.length} of {products.length} oil products
          </p>
        </CardContent>
    </Card>
  );
}
