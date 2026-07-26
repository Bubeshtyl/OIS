"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Download, Loader2, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  dailySalesFiltersToSearchParams,
  VEHICLE_SEGMENT_OPTIONS,
  type DailySalesFilters,
  type VehicleSegmentFilter,
} from "@/lib/daily-sales/filters";

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
      {children}
    </p>
  );
}

const controlClass = "h-8 w-full min-w-0 rounded-sm bg-background text-sm";

export function DailySalesFilters({
  initialFilters,
  products,
  mopTypes,
  isPending = false,
  canExport = false,
  exporting = false,
  onExport,
  onNavigate,
}: {
  initialFilters: DailySalesFilters;
  products: string[];
  mopTypes: string[];
  isPending?: boolean;
  canExport?: boolean;
  exporting?: boolean;
  onExport?: () => void;
  onNavigate: (href: string) => void;
}) {
  const pathname = usePathname();
  const [draft, setDraft] = useState<DailySalesFilters>(initialFilters);
  const [open, setOpen] = useState(!initialFilters.applied);

  function update<K extends keyof DailySalesFilters>(
    key: K,
    value: DailySalesFilters[K]
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function apply() {
    if (isPending) return;
    const params = dailySalesFiltersToSearchParams({ ...draft, applied: true });
    const query = params.toString();
    setOpen(false);
    onNavigate(query ? `${pathname}?${query}` : pathname);
  }

  function clearAll() {
    if (isPending) return;
    setDraft({
      applied: false,
      vehicleSegment: "all",
    });
    setOpen(true);
    onNavigate(pathname);
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="group/filters overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      <div className="flex items-center gap-2 bg-sidebar px-3 py-2.5 text-sidebar-foreground sm:px-4">
        <CollapsibleTrigger
          render={
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            />
          }
        >
          <ChevronDown className="size-4 shrink-0 transition-transform duration-200 group-data-open/filters:rotate-180" />
          <span className="truncate text-sm font-semibold tracking-tight">
            Filter transactions
          </span>
        </CollapsibleTrigger>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={clearAll}
          >
            Clear all
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-sm"
            disabled={isPending}
            onClick={apply}
          >
            {isPending ? (
              <>
                <Loader2 className="animate-spin" data-icon="inline-start" />
                Loading…
              </>
            ) : (
              "Apply"
            )}
          </Button>
          {onExport ? (
            <Button
              type="button"
              size="sm"
              className="rounded-sm border border-emerald-400/35 bg-emerald-500/15 text-black hover:bg-emerald-500/25 hover:text-black"
              disabled={!canExport || isPending || exporting}
              onClick={onExport}
            >
              {exporting ? (
                <>
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                  Exporting…
                </>
              ) : (
                <>
                  <Download data-icon="inline-start" />
                  Export Excel
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>

      <CollapsibleContent>
        <div className="space-y-4 p-4 md:p-5">
          <section className="space-y-2">
            <SectionLabel>Date range</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              <div className="min-w-0 space-y-1">
                <Label
                  htmlFor="ds-start"
                  className="text-xs text-muted-foreground"
                >
                  Start (date &amp; time)
                </Label>
                <DateTimePicker
                  id="ds-start"
                  value={draft.start}
                  onChange={(value) => update("start", value)}
                  placeholder="Pick start date & time"
                  defaultTime="00:00"
                  className="rounded-sm"
                />
              </div>
              <div className="min-w-0 space-y-1">
                <Label htmlFor="ds-end" className="text-xs text-muted-foreground">
                  End (date &amp; time)
                </Label>
                <DateTimePicker
                  id="ds-end"
                  value={draft.end}
                  onChange={(value) => update("end", value)}
                  placeholder="Pick end date & time"
                  defaultTime="23:59"
                  className="rounded-sm"
                />
              </div>
            </div>
          </section>

          <Separator />

          <section className="space-y-2 rounded-sm border border-sidebar-border bg-sidebar/40 p-3">
            <div className="flex items-center gap-2">
              <ReceiptText className="size-3.5 text-sidebar-foreground" />
              <SectionLabel>Receipt no.</SectionLabel>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <Input
                inputMode="numeric"
                placeholder="e.g. 6072606332"
                value={draft.receiptFrom ?? ""}
                onChange={(e) =>
                  update("receiptFrom", e.target.value || undefined)
                }
                className={controlClass}
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                inputMode="numeric"
                placeholder="e.g. 6072606351"
                value={draft.receiptTo ?? ""}
                onChange={(e) =>
                  update("receiptTo", e.target.value || undefined)
                }
                className={controlClass}
              />
            </div>
          </section>

          <section className="space-y-2">
            <SectionLabel>Product &amp; payment</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              <div className="min-w-0 space-y-1">
                <Label className="text-xs text-muted-foreground">Product</Label>
                <Select
                  value={draft.product ?? "all"}
                  onValueChange={(value) =>
                    update(
                      "product",
                      value && value !== "all" ? value : undefined
                    )
                  }
                  items={[
                    { value: "all", label: "All products" },
                    ...products.map((p) => ({ value: p, label: p })),
                  ]}
                >
                  <SelectTrigger size="sm" className={controlClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All products</SelectItem>
                    {products.map((product) => (
                      <SelectItem key={product} value={product}>
                        {product}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 space-y-1">
                <Label className="text-xs text-muted-foreground">MOP type</Label>
                <Select
                  value={draft.mopType ?? "all"}
                  onValueChange={(value) =>
                    update(
                      "mopType",
                      value && value !== "all" ? value : undefined
                    )
                  }
                  items={[
                    { value: "all", label: "All MOP types" },
                    ...mopTypes.map((m) => ({ value: m, label: m })),
                  ]}
                >
                  <SelectTrigger size="sm" className={controlClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All MOP types</SelectItem>
                    {mopTypes.map((mop) => (
                      <SelectItem key={mop} value={mop}>
                        {mop}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <SectionLabel>Amounts &amp; volume</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              <div className="min-w-0 space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Amount (Rs.)
                </Label>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Min"
                    value={draft.amountMin ?? ""}
                    onChange={(e) =>
                      update("amountMin", e.target.value || undefined)
                    }
                    className={controlClass}
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Max"
                    value={draft.amountMax ?? ""}
                    onChange={(e) =>
                      update("amountMax", e.target.value || undefined)
                    }
                    className={controlClass}
                  />
                </div>
              </div>
              <div className="min-w-0 space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Volume (Ltr.)
                </Label>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Min"
                    value={draft.volumeMin ?? ""}
                    onChange={(e) =>
                      update("volumeMin", e.target.value || undefined)
                    }
                    className={controlClass}
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Max"
                    value={draft.volumeMax ?? ""}
                    onChange={(e) =>
                      update("volumeMax", e.target.value || undefined)
                    }
                    className={controlClass}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <SectionLabel>Vehicle</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              <div className="min-w-0 space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Vehicle segment
                </Label>
                <Select
                  value={draft.vehicleSegment}
                  onValueChange={(value) =>
                    update(
                      "vehicleSegment",
                      (value as VehicleSegmentFilter) || "all"
                    )
                  }
                  items={VEHICLE_SEGMENT_OPTIONS.map((option) => ({
                    value: option.value,
                    label:
                      option.value === "all" ? "All segments" : option.label,
                  }))}
                >
                  <SelectTrigger size="sm" className={controlClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_SEGMENT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.value === "all" ? "All segments" : option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 space-y-1">
                <Label
                  htmlFor="ds-vehicle-q"
                  className="text-xs text-muted-foreground"
                >
                  Vehicle no. / Mobile no.
                </Label>
                <Input
                  id="ds-vehicle-q"
                  placeholder="Type vehicle or mobile number"
                  value={draft.vehicleOrMobile ?? ""}
                  onChange={(e) =>
                    update("vehicleOrMobile", e.target.value || undefined)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      apply();
                    }
                  }}
                  className={controlClass}
                />
              </div>
            </div>
          </section>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
