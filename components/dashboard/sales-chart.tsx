"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bar, BarChart, Tooltip, XAxis, YAxis } from "recharts";
import type { StockDisplayUnit } from "@/lib/format";

const CHART_HEIGHT = 192;

export function SalesChart({
  data,
  unit = "packets",
}: {
  data: Array<{ label: string; quantity: number; litres?: number }>;
  unit?: StockDisplayUnit;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const chartData = useMemo(
    () =>
      data.map((point) => ({
        label: point.label,
        quantity: unit === "litres" ? (point.litres ?? point.quantity) : point.quantity,
      })),
    [data, unit]
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    function updateWidth() {
      const nextWidth = element?.getBoundingClientRect().width ?? 0;
      if (nextWidth > 0) {
        setWidth(nextWidth);
      }
    }

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="h-48 w-full min-w-0">
      {width > 0 ? (
        <BarChart width={width} height={CHART_HEIGHT} data={chartData}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            width={32}
          />
          <Tooltip
            formatter={(value) => [
              `${value}${unit === "litres" ? " L" : ""}`,
              "Sold",
            ]}
          />
          <Bar
            dataKey="quantity"
            fill="oklch(0.47 0.075 198)"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      ) : null}
    </div>
  );
}
