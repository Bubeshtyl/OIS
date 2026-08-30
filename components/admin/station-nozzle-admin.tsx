"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Edit2,
  Fuel,
  Gauge,
  Layers,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { FuelProduct, StationNozzle, StationPump } from "@/lib/db/schema";
import type {
  StationLayout,
} from "@/lib/station-config/service";
import {
  createNozzleAction,
  createPumpAction,
  deleteNozzleAction,
  deletePumpAction,
  updateNozzleAction,
  updatePumpAction,
} from "@/lib/actions/station-config";
import type { ActionState } from "@/lib/actions/inventory";
import { cn } from "@/lib/utils";
import { ProductDialog } from "@/components/admin/station-products-admin";

const initialState: ActionState = { success: false };

const COLOR_OPTIONS = [
  { label: "Emerald (Green)", value: "emerald", badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300" },
  { label: "Amber (Orange)", value: "amber", badgeClass: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300" },
  { label: "Blue", value: "blue", badgeClass: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300" },
  { label: "Purple", value: "purple", badgeClass: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300" },
  { label: "Rose (Red)", value: "rose", badgeClass: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300" },
  { label: "Sky (Cyan)", value: "sky", badgeClass: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300" },
];

export function getProductBadgeClass(color?: string | null) {
  const match = COLOR_OPTIONS.find((c) => c.value === color);
  return match?.badgeClass || "bg-secondary text-secondary-foreground border-border";
}

// ---------------- Add / Edit Pump Dialog ---------------- //

function PumpDialog({
  pump,
  nextPumpNumber,
  trigger,
}: {
  pump?: StationPump;
  nextPumpNumber?: number;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    pump ? updatePumpAction : createPumpAction,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      setOpen(false);
      router.refresh();
    }
    if (state.error) toast.error(state.error);
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{pump ? "Edit Pump" : "Add New Pump"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4 pt-2">
          {pump && <input type="hidden" name="id" value={pump.id} />}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pump-number">Pump Number *</Label>
              <Input
                id="pump-number"
                name="pumpNumber"
                type="number"
                min="1"
                defaultValue={pump?.pumpNumber ?? nextPumpNumber ?? 1}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pump-name">Display Name</Label>
              <Input
                id="pump-name"
                name="name"
                defaultValue={pump?.name || ""}
              />
            </div>
          </div>
          {pump && (
            <div className="flex items-center justify-between pt-1">
              <Label htmlFor="pump-active" className="cursor-pointer">Active Status</Label>
              <input type="hidden" name="isActive" value={pump.isActive ? "true" : "false"} />
              <Switch
                id="pump-active"
                defaultChecked={pump.isActive}
                onCheckedChange={(checked) => {
                  const input = document.querySelector('input[name="isActive"]') as HTMLInputElement;
                  if (input) input.value = checked ? "true" : "false";
                }}
              />
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : pump ? "Update Pump" : "Add Pump"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- Add / Edit Nozzle Dialog ---------------- //

function NozzleDialog({
  nozzle,
  defaultPumpId,
  pumps,
  products,
  trigger,
}: {
  nozzle?: StationNozzle;
  defaultPumpId?: string;
  pumps: StationPump[];
  products: FuelProduct[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    nozzle ? updateNozzleAction : createNozzleAction,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      setOpen(false);
      router.refresh();
    }
    if (state.error) toast.error(state.error);
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{nozzle ? "Edit Nozzle" : "Add Nozzle"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4 pt-2">
          {nozzle && <input type="hidden" name="id" value={nozzle.id} />}
          <div className="space-y-2">
            <Label htmlFor="nozzle-pump">Assigned Pump *</Label>
            <Select
              name="pumpId"
              defaultValue={nozzle?.pumpId || defaultPumpId || pumps[0]?.id}
              items={pumps.map((p) => ({
                value: p.id,
                label: p.name,
              }))}
            >
              <SelectTrigger id="nozzle-pump" className="w-full">
                <SelectValue placeholder="Select pump" />
              </SelectTrigger>
              <SelectContent>
                {pumps.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="nozzle-number">Nozzle Number *</Label>
              <Input
                id="nozzle-number"
                name="nozzleNumber"
                type="number"
                min="1"
                defaultValue={nozzle?.nozzleNumber || 1}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nozzle-name">Display Name</Label>
              <Input
                id="nozzle-name"
                name="name"
                defaultValue={nozzle?.name || ""}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nozzle-product">Dispensed Fuel Product</Label>
            <Select
              name="productId"
              defaultValue={nozzle?.productId || "none"}
              items={[
                { value: "none", label: "None / Unassigned" },
                ...products.map((p) => ({
                  value: p.id,
                  label: `${p.name} ${p.code ? `(${p.code})` : ""}`.trim(),
                })),
              ]}
            >
              <SelectTrigger id="nozzle-product" className="w-full">
                <SelectValue placeholder="Select product (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None / Unassigned</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.code ? `(${p.code})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {nozzle && (
            <div className="flex items-center justify-between pt-1">
              <Label htmlFor="nozzle-active" className="cursor-pointer">Active Status</Label>
              <input type="hidden" name="isActive" value={nozzle.isActive ? "true" : "false"} />
              <Switch
                id="nozzle-active"
                defaultChecked={nozzle.isActive}
                onCheckedChange={(checked) => {
                  const input = document.querySelector('input[name="isActive"]') as HTMLInputElement;
                  if (input) input.value = checked ? "true" : "false";
                }}
              />
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : nozzle ? "Update Nozzle" : "Add Nozzle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------- Main Station Nozzle Admin Component ---------------- //

export function StationNozzleAdmin({ layout }: { layout: StationLayout }) {
  const router = useRouter();
  const [deleting, startDelete] = useTransition();

  const pumps = layout.pumps;
  const products = layout.products;

  const nextPumpNumber =
    pumps.length > 0 ? Math.max(...pumps.map((p) => p.pumpNumber)) + 1 : 1;

  function handleDeletePump(pump: StationPump) {
    if (!confirm(`Delete "${pump.name}" and all its assigned nozzles?`)) return;
    startDelete(async () => {
      const res = await deletePumpAction(pump.id);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else if (res.error) toast.error(res.error);
    });
  }

  function handleDeleteNozzle(nozzle: StationNozzle) {
    if (!confirm(`Delete "${nozzle.name}"?`)) return;
    startDelete(async () => {
      const res = await deleteNozzleAction(nozzle.id);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else if (res.error) toast.error(res.error);
    });
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Gauge className="size-5 text-primary" />
            Pump & Nozzle Configuration
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ProductDialog
            trigger={
              <Button variant="outline" size="sm" className="text-xs">
                <Fuel className="mr-1.5 size-3.5 text-primary" />
                Add Product
              </Button>
            }
          />
          <PumpDialog
            nextPumpNumber={nextPumpNumber}
            trigger={
              <Button size="sm" className="text-xs">
                <Plus className="mr-1.5 size-3.5" />
                Add Pump
              </Button>
            }
          />
        </div>
      </div>

      {/* Visual Pump -> Nozzles Layout Matrix */}
      <Card className="border shadow-sm">
        <CardHeader className="py-2.5 px-3.5">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <Layers className="size-3.5 text-primary" />
            Active Station Layout Mapping
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="grid grid-cols-1 gap-3">
            {pumps.map((pump) => (
              <div
                key={pump.id}
                className="rounded-lg border bg-card/80 p-3 shadow-2xs hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-[140px]">
                  <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 font-bold text-primary text-sm">
                    P{pump.pumpNumber}
                  </span>
                  <span className="font-semibold text-sm text-foreground">{pump.name}</span>
                </div>

                {/* Nozzles under this pump */}
                <div className="flex-1 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground mr-1">Nozzles:</span>
                  {pump.nozzles.length === 0 ? (
                    <span className="text-xs italic text-muted-foreground">No nozzles assigned</span>
                  ) : (
                    pump.nozzles.map((nz) => (
                      <div key={nz.id} className="inline-flex items-center group">
                        <NozzleDialog
                          nozzle={nz}
                          pumps={pumps}
                          products={products}
                          trigger={
                            <button
                              type="button"
                              className={cn(
                                "inline-flex h-7 items-center gap-1 rounded-l-md border border-r-0 px-2.5 text-xs font-semibold transition-colors hover:ring-2 hover:ring-primary/40",
                                getProductBadgeClass(nz.product?.color)
                              )}
                            >
                              <span className="font-bold">N{nz.nozzleNumber}</span>
                              {nz.product && (
                                <span className="text-[11px] font-medium opacity-90">({nz.product.code || nz.product.name})</span>
                              )}
                            </button>
                          }
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeleteNozzle(nz)}
                          disabled={deleting}
                          className="h-7 w-6 rounded-l-none rounded-r-md px-0 text-muted-foreground hover:text-destructive border-l-0"
                          title={`Delete ${nz.name}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                  <NozzleDialog
                    defaultPumpId={pump.id}
                    pumps={pumps}
                    products={products}
                    trigger={
                      <Button
                        variant="default"
                        size="sm"
                        className="h-7 px-3 text-xs font-semibold shadow-xs"
                      >
                        <Plus className="mr-1 size-3.5" />
                        Add Nozzle
                      </Button>
                    }
                  />
                  <PumpDialog
                    pump={pump}
                    trigger={
                      <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground">
                        <Edit2 className="size-4" />
                      </Button>
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeletePump(pump)}
                    disabled={deleting}
                    className="size-7 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
