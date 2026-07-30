"use client";

import { useEffect, useRef, useState } from "react";
import { Bar, BarChart, Tooltip, XAxis, YAxis } from "recharts";
import { formatInr, formatInrCompact } from "@/lib/format";

const CHART_HEIGHT = 280;

export function SalesMetricsChart({
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
        <BarChart width={width} height={CHART_HEIGHT} data={data}>
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
          <Bar
            dataKey="amount"
            fill="oklch(0.47 0.075 198)"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      ) : null}
    </div>
  );
}
