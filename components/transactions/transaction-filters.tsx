"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";
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
import type { TransactionPageKind } from "@/lib/transactions/page-config";
import { PAGE_CONFIG } from "@/lib/transactions/page-config";
import { applyUrlFilterUpdates } from "@/lib/url-filters";

type CreatorOption = { id: string; name: string };

export function TransactionFilters({
  pageKind,
  creators,
  recordedBy,
  searchValue,
  onSearchChange,
  unit = "packets",
  onUnitChange,
}: {
  pageKind: TransactionPageKind;
  creators: CreatorOption[];
  recordedBy?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  unit?: StockDisplayUnit;
  onUnitChange: (unit: StockDisplayUnit) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const config = PAGE_CONFIG[pageKind];

  const pushParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      applyUrlFilterUpdates(params, updates, { resetPage: true });
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;

    if (params.has("product")) {
      params.delete("product");
      changed = true;
    }
    if (params.has("search")) {
      params.delete("search");
      changed = true;
    }
    if (params.has("page")) {
      params.delete("page");
      changed = true;
    }

    if (!changed) return;

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [pathname, router, searchParams]);

  return (
    <div className="flex flex-col gap-3">
      <SearchFilterInput
        value={searchValue}
        onChange={onSearchChange}
        onSubmit={() => {}}
        placeholder={config.searchPlaceholder}
      />

      <div
        className={
          config.showStaffFilter
            ? "grid min-w-0 gap-3 sm:grid-cols-2"
            : "min-w-0"
        }
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

        <StockUnitToggle
          unit={unit}
          onChange={onUnitChange}
          className="h-10 w-full min-w-0 p-1"
        />
      </div>
    </div>
  );
}
