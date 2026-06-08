"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { StockUnitToggle } from "@/components/shared/stock-unit-toggle";
import { SearchFilterInput } from "@/components/shared/search-filter-input";
import type { StockDisplayUnit } from "@/lib/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { applyUrlFilterUpdates } from "@/lib/url-filters";

type ProductOption = { id: string; name: string };

const LOCATIONS = [
  { value: "all", label: "All Locations" },
  { value: "depot", label: "Depot" },
  { value: "manager", label: "Manager" },
] as const;

export function StockCountFilters({
  products,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  productId,
  location,
  unit = "packets",
  onUnitChange,
}: {
  products: ProductOption[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  productId?: string;
  location?: string;
  unit?: StockDisplayUnit;
  onUnitChange: (unit: StockDisplayUnit) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function pushParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    applyUrlFilterUpdates(params, updates);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex flex-col gap-3">
      <SearchFilterInput
        value={searchValue}
        onChange={onSearchChange}
        onSubmit={onSearchSubmit}
        placeholder="Search oil type…"
      />

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
        <Select
          value={location ?? "all"}
          onValueChange={(value) =>
            pushParams({
              location: value && value !== "all" ? value : undefined,
            })
          }
          items={LOCATIONS.map((item) => ({
            value: item.value,
            label: item.label,
          }))}
        >
          <SelectTrigger className="h-10 w-full min-w-0 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOCATIONS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={productId ?? "all"}
          onValueChange={(value) =>
            pushParams({
              product: value && value !== "all" ? value : undefined,
            })
          }
          items={[
            { value: "all", label: "All Oil Types" },
            ...products.map((p) => ({ value: p.id, label: p.name })),
          ]}
        >
          <SelectTrigger className="h-10 w-full min-w-0 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Oil Types</SelectItem>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <StockUnitToggle
          unit={unit}
          onChange={onUnitChange}
          className="h-10 w-full min-w-0 p-1"
        />
      </div>
    </div>
  );
}
