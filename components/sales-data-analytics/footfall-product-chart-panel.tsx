"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { FootfallMetricsChart } from "@/components/sales-data-analytics/analytics-charts-dynamic";
import { FootfallMetricsTable } from "@/components/sales-data-analytics/footfall-metrics-table";
import { FootfallProductTabs } from "@/components/sales-data-analytics/footfall-product-tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FOOTFALL_ALL_KEY,
  footfallPointsForTab,
  type FootfallTabDataset,
} from "@/lib/daily-sales/footfall-datasets";

function resolveProduct(
  products: string[],
  value: string | null | undefined
): string | undefined {
  const trimmed = value?.trim();
  if (trimmed && products.includes(trimmed)) return trimmed;
  return undefined;
}

export function FootfallProductChartPanel({
  title,
  labelHeader,
  products,
  initialProduct,
  dataset,
}: {
  title: string;
  labelHeader: string;
  products: string[];
  initialProduct?: string;
  dataset: FootfallTabDataset;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [product, setProduct] = useState(() =>
    resolveProduct(products, initialProduct)
  );

  useEffect(() => {
    setProduct(resolveProduct(products, initialProduct));
  }, [products, initialProduct]);

  const data = useMemo(
    () => footfallPointsForTab(dataset, product),
    [dataset, product]
  );

  function onProductChange(next: string) {
    const resolved =
      next === FOOTFALL_ALL_KEY
        ? undefined
        : resolveProduct(products, next);
    setProduct(resolved);

    const params = new URLSearchParams(searchParams.toString());
    if (!resolved) {
      params.delete("product");
    } else {
      params.set("product", resolved);
    }
    const query = params.toString();
    const href = query ? `${pathname}?${query}` : pathname;
    // Keep URL shareable without triggering a server refetch.
    window.history.replaceState(window.history.state, "", href);
  }

  return (
    <>
      <FootfallProductTabs
        products={products}
        product={product}
        onProductChange={onProductChange}
      />

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <FootfallMetricsChart
            key={`${title}-${product ?? FOOTFALL_ALL_KEY}`}
            data={data}
          />
          <FootfallMetricsTable data={data} labelHeader={labelHeader} />
        </CardContent>
      </Card>
    </>
  );
}
