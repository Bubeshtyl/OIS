"use client";

import { useEffect, useRef, useState } from "react";
import { Cell, Legend, Pie, PieChart, Tooltip } from "recharts";
import { formatInr } from "@/lib/format";

const CHART_HEIGHT = 280;

const COLORS = [
  "oklch(0.47 0.075 198)",
  "oklch(0.55 0.12 145)",
  "oklch(0.62 0.14 55)",
  "oklch(0.55 0.14 25)",
  "oklch(0.52 0.12 280)",
  "oklch(0.58 0.10 230)",
  "oklch(0.50 0.08 330)",
  "oklch(0.45 0.06 160)",
];

export function SalesBreakdownPieChart({
  data,
}: {
  data: Array<{ name: string; amount: number }>;
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

  if (data.length === 0) {
    return (
      <p className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        No sales in this range.
      </p>
    );
  }

  return (
    <div ref={containerRef} className="h-[280px] w-full min-w-0">
      {width > 0 ? (
        <PieChart width={width} height={CHART_HEIGHT}>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="name"
            cx="50%"
            cy="45%"
            outerRadius={90}
            innerRadius={42}
            paddingAngle={1}
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={COLORS[index % COLORS.length]}
                stroke="var(--card)"
                strokeWidth={1}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [formatInr(Number(value)), "Sales"]}
            labelStyle={{ color: "var(--foreground)" }}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => (
              <span className="text-xs text-muted-foreground">{value}</span>
            )}
          />
        </PieChart>
      ) : null}
    </div>
  );
}
