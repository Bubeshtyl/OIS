"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const ALL_VALUE = "all";

export function FootfallProductTabs({
  products,
  product,
  className,
}: {
  products: string[];
  product?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = product && products.includes(product) ? product : ALL_VALUE;

  function handleChange(next: string | number | null) {
    if (typeof next !== "string") return;

    const params = new URLSearchParams(searchParams.toString());
    if (next === ALL_VALUE) {
      params.delete("product");
    } else {
      params.set("product", next);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <Tabs
      value={active}
      onValueChange={handleChange}
      className={cn("w-full", className)}
    >
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 p-1">
        <TabsTrigger value={ALL_VALUE} className="px-3">
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
