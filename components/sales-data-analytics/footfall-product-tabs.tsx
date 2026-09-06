"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FOOTFALL_ALL_KEY } from "@/lib/daily-sales/footfall-datasets";
import { cn } from "@/lib/utils";

export function FootfallProductTabs({
  products,
  product,
  onProductChange,
  className,
}: {
  products: string[];
  product?: string;
  onProductChange: (next: string) => void;
  className?: string;
}) {
  const active = product && products.includes(product) ? product : FOOTFALL_ALL_KEY;

  function handleChange(next: string | number | null) {
    if (typeof next !== "string") return;
    if (next === active) return;
    onProductChange(next);
  }

  return (
    <Tabs
      value={active}
      onValueChange={handleChange}
      className={cn("w-full", className)}
    >
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 p-1">
        <TabsTrigger value={FOOTFALL_ALL_KEY} className="px-3">
          All
        </TabsTrigger>
        {products.map((name) => (
          <TabsTrigger key={name} value={name} className="px-3">
            {name}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
