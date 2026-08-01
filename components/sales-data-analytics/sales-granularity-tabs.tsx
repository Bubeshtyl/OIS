"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ANALYTICS_GRANULARITIES,
  type AnalyticsGranularity,
} from "@/lib/daily-sales/analytics-period";
import { cn } from "@/lib/utils";

const LABELS: Record<AnalyticsGranularity, string> = {
  hour: "Hourly",
  day: "Daily",
  week: "Weekly",
  month: "Monthly",
  year: "Yearly",
};

export function SalesGranularityTabs({
  granularity,
  className,
}: {
  granularity: AnalyticsGranularity;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(next: string | number | null) {
    if (typeof next !== "string") return;
    if (!(ANALYTICS_GRANULARITIES as readonly string[]).includes(next)) return;

    const params = new URLSearchParams(searchParams.toString());
    if (next === "day") {
      params.delete("granularity");
    } else {
      params.set("granularity", next);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <Tabs
      value={granularity}
      onValueChange={handleChange}
      className={cn("w-full", className)}
    >
      <TabsList className="grid h-auto w-full grid-cols-5 gap-1 p-1 sm:inline-flex sm:w-auto sm:grid-cols-none">
        {ANALYTICS_GRANULARITIES.map((value) => (
          <TabsTrigger key={value} value={value} className="px-3">
            {LABELS[value]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
