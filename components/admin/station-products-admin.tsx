"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Edit2,
  Fuel,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FuelProduct } from "@/lib/db/schema";
import {
  createFuelProductAction,
  deleteFuelProductAction,
  updateFuelProductAction,
} from "@/lib/actions/station-config";
import type { ActionState } from "@/lib/actions/inventory";
import { cn } from "@/lib/utils";
import { getProductBadgeClass } from "@/components/admin/station-nozzle-admin";

const initialState: ActionState = { success: false };

const COLOR_OPTIONS = [
  { label: "Emerald (Green)", value: "emerald" },
  { label: "Amber (Orange)", value: "amber" },
  { label: "Blue", value: "blue" },
  { label: "Purple", value: "purple" },
  { label: "Rose (Red)", value: "rose" },
  { label: "Sky (Cyan)", value: "sky" },
];

export function ProductDialog({
  product,
  trigger,
}: {
  product?: FuelProduct;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    product ? updateFuelProductAction : createFuelProductAction,
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
          <DialogTitle>{product ? "Edit Fuel Product" : "Add Fuel Product"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4 pt-2">
          {product && <input type="hidden" name="id" value={product.id} />}
          <div className="space-y-2">
            <Label htmlFor="prod-name">Product Name *</Label>
            <Input
              id="prod-name"
              name="name"
              defaultValue={product?.name || ""}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="prod-code">Code / Short Tag</Label>
              <Input
                id="prod-code"
                name="code"
                defaultValue={product?.code || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prod-color">Badge Color</Label>
              <Select
                name="color"
                defaultValue={product?.color || "emerald"}
                items={COLOR_OPTIONS.map((c) => ({ value: c.value, label: c.label }))}
              >
                <SelectTrigger id="prod-color" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {product && (
            <div className="flex items-center justify-between pt-1">
              <Label htmlFor="prod-active" className="cursor-pointer">Active Status</Label>
              <input type="hidden" name="isActive" value={product.isActive ? "true" : "false"} />
              <Switch
                id="prod-active"
                defaultChecked={product.isActive}
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
              {pending ? "Saving..." : product ? "Update Product" : "Add Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function StationFuelProductsAdmin({ products }: { products: FuelProduct[] }) {
  const router = useRouter();
  const [deleting, startDelete] = useTransition();

  function handleDeleteProduct(prod: FuelProduct) {
    if (!confirm(`Delete fuel product "${prod.name}"?`)) return;
    startDelete(async () => {
      const res = await deleteFuelProductAction(prod.id);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else if (res.error) toast.error(res.error);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Fuel className="size-5 text-primary" />
            Fuel Products Configuration
          </h2>
        </div>
        <ProductDialog
          trigger={
            <Button size="sm" className="text-xs">
              <Plus className="mr-1.5 size-3.5" />
              Add Fuel Product
            </Button>
          }
        />
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Configured Fuel Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead className="w-[120px]">Code</TableHead>
                  <TableHead className="w-[140px]">Color Badge</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                      No fuel products added yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((p) => (
                    <TableRow key={p.id} className="hover:bg-muted/30">
                      <TableCell className="font-semibold text-foreground">{p.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {p.code || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("font-medium", getProductBadgeClass(p.color))}>
                          {p.color || "default"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.isActive ? "secondary" : "outline"} className="text-xs">
                          {p.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <ProductDialog
                            product={p}
                            trigger={
                              <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground">
                                <Edit2 className="size-3.5" />
                              </Button>
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteProduct(p)}
                            disabled={deleting}
                            className="size-7 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
