"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { StockCountFilters } from "@/components/stock-count/stock-count-filters";
import { useStockDisplayUnit } from "@/components/shared/use-stock-display-unit";
import {
  StockCountTable,
  type StockCountRow,
} from "@/components/stock-count/stock-count-table";
import { StockCountSummary } from "@/components/stock-count/stock-count-summary";
import { PageHeader } from "@/components/shared/page-blocks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatStockQuantity,
  type StockDisplayUnit,
} from "@/lib/format";

type ProductInput = {
  id: string;
  name: string;
  depot: number;
  manager: number;
  depotPackets: number;
  managerPackets: number;
  costPrice: number;
};

export function StockCountView({
  products,
  totals,
  lowStockIds,
  search,
  productId,
  location = "all",
  unit = "packets",
}: {
  products: ProductInput[];
  totals: {
    depotQty: number;
    managerQty: number;
    depotPackets: number;
    managerPackets: number;
    depotValue: number;
    managerValue: number;
  };
  lowStockIds: string[];
  search?: string;
  productId?: string;
  location?: string;
  unit?: StockDisplayUnit;
}) {
  const { unit: displayUnit, setDisplayUnit } = useStockDisplayUnit(unit);
  const locationFilter =
    location === "depot" || location === "manager" ? location : "all";
  const lowStockSet = new Set(lowStockIds);

  const filteredRows = useMemo(() => {
    const term = search?.trim().toLowerCase();

    return products
      .filter((product) => {
        if (productId && product.id !== productId) return false;
        if (locationFilter === "depot" && product.depot <= 0) return false;
        if (locationFilter === "manager" && product.manager <= 0) return false;
        if (term && !product.name.toLowerCase().includes(term)) return false;
        return true;
      })
      .map(
        (product): StockCountRow => ({
          id: product.id,
          name: product.name,
          depot: product.depot,
          manager: product.manager,
          depotPackets: product.depotPackets,
          managerPackets: product.managerPackets,
          costPrice: product.costPrice,
          isLowStock: lowStockSet.has(product.id),
        })
      );
  }, [products, productId, locationFilter, search, lowStockSet]);

  const filteredTotals = useMemo(() => {
    let depotQty = 0;
    let managerQty = 0;
    let depotPackets = 0;
    let managerPackets = 0;
    let totalValue = 0;

    for (const row of filteredRows) {
      depotQty += row.depot;
      managerQty += row.manager;
      depotPackets += row.depotPackets;
      managerPackets += row.managerPackets;
      totalValue += (row.depot + row.manager) * row.costPrice;
    }

    return {
      depotQty,
      managerQty,
      depotPackets,
      managerPackets,
      totalValue,
      productCount: filteredRows.length,
    };
  }, [filteredRows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Button
            render={
              <Link
                href="/dashboard"
                className="inline-flex h-8 items-center gap-1.5 px-0 text-sm text-muted-foreground hover:text-foreground"
              />
            }
            variant="ghost"
            size="sm"
            nativeButton={false}
          >
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Button>
          <PageHeader
            title="Stock Count"
            subtitle="Current system balances by oil type"
          />
        </div>
        <Button
          render={<Link href="/reports?report=stock-summary" />}
          variant="outline"
          size="sm"
          className="shrink-0"
          nativeButton={false}
        >
          View period movement
        </Button>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="space-y-4 p-4">
          <StockCountFilters
            products={products.map((p) => ({ id: p.id, name: p.name }))}
            search={search}
            productId={productId}
            location={location}
            unit={displayUnit}
            onUnitChange={setDisplayUnit}
          />

          <div className="overflow-x-auto rounded-lg border [scrollbar-gutter:stable]">
            <StockCountTable
              rows={filteredRows}
              location={locationFilter}
              unit={displayUnit}
            />
          </div>

          <p className="text-sm text-muted-foreground">
            Showing {filteredRows.length} of {products.length} oil types ·{" "}
            {formatStockQuantity(
              displayUnit,
              totals.depotPackets + totals.managerPackets,
              totals.depotQty + totals.managerQty
            )}{" "}
            total system stock
          </p>
        </CardContent>
      </Card>

      <StockCountSummary
        depotQty={filteredTotals.depotQty}
        managerQty={filteredTotals.managerQty}
        depotPackets={filteredTotals.depotPackets}
        managerPackets={filteredTotals.managerPackets}
        totalValue={filteredTotals.totalValue}
        productCount={filteredTotals.productCount}
        unit={displayUnit}
      />
    </div>
  );
}
