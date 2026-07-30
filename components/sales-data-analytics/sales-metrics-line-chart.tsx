"use client";

import { useEffect, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatInr, formatInrCompact } from "@/lib/format";

const CHART_HEIGHT = 280;

export function SalesMetricsLineChart({
  data,
}: {
  data: Array<{ label: string; amount: number }>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

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
    <div ref={containerRef} className="h-[280px] w-full min-w-0">
      {width > 0 ? (
        <LineChart width={width} height={CHART_HEIGHT} data={data}>
          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            width={56}
            tickFormatter={(value) => formatInrCompact(Number(value))}
          />
          <Tooltip
            formatter={(value) => [formatInr(Number(value)), "Sales"]}
            labelStyle={{ color: "var(--foreground)" }}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
            }}
          />
          <Line
            type="monotone"
            dataKey="amount"
            stroke="oklch(0.47 0.075 198)"
            strokeWidth={2}
            dot={{ r: 3, fill: "oklch(0.47 0.075 198)" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      ) : null}
    </div>
  );
}
