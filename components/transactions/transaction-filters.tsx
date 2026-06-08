"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { StockUnitToggle } from "@/components/shared/stock-unit-toggle";
import { Input } from "@/components/ui/input";
import type { StockDisplayUnit } from "@/lib/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TransactionPageKind } from "@/lib/transactions/page-config";
import { PAGE_CONFIG } from "@/lib/transactions/page-config";

type ProductOption = { id: string; name: string };
type CreatorOption = { id: string; name: string };

export function TransactionFilters({
  pageKind,
  products,
  creators,
  productId,
  recordedBy,
  search,
  unit = "packets",
  onUnitChange,
}: {
  pageKind: TransactionPageKind;
  products: ProductOption[];
  creators: CreatorOption[];
  productId?: string;
  recordedBy?: string;
  search?: string;
  unit?: StockDisplayUnit;
  onUnitChange: (unit: StockDisplayUnit) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const config = PAGE_CONFIG[pageKind];
  const [searchDraft, setSearchDraft] = useState(search ?? "");

  useEffect(() => {
    setSearchDraft(search ?? "");
  }, [search]);

  function pushParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");

    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    pushParams({ search: searchDraft.trim() || undefined });
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSearchSubmit} className="relative min-w-0">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          placeholder={config.searchPlaceholder}
          className="h-10 bg-card pl-9"
        />
      </form>

      <div
        className={`grid min-w-0 gap-3 ${config.showStaffFilter ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
      >
        {config.showStaffFilter && (
          <Select
            value={recordedBy ?? "all"}
            onValueChange={(value) =>
              pushParams({
                recordedBy: value && value !== "all" ? value : undefined,
              })
            }
            items={[
              { value: "all", label: config.staffFilterLabel },
              ...creators.map((c) => ({ value: c.id, label: c.name })),
            ]}
          >
            <SelectTrigger className="h-10 w-full min-w-0 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{config.staffFilterLabel}</SelectItem>
              {creators.map((creator) => (
                <SelectItem key={creator.id} value={creator.id}>
                  {creator.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

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
