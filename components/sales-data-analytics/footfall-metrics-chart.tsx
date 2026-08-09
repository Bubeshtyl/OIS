"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  LabelList,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CHART_HEIGHT = 300;

function formatCount(value: number) {
  return value.toLocaleString("en-IN");
}

export function FootfallMetricsChart({
  data,
}: {
  data: Array<{ label: string; count: number }>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  const midrange = useMemo(() => {
    if (data.length === 0) return null;
    let min = data[0].count;
    let max = data[0].count;
    for (const point of data) {
      if (point.count < min) min = point.count;
      if (point.count > max) max = point.count;
    }
    return (min + max) / 2;
  }, [data]);

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
    <div ref={containerRef} className="relative h-[300px] w-full min-w-0">
      {midrange !== null ? (
        <div className="pointer-events-none absolute top-0 right-0 z-10 text-xs font-medium text-muted-foreground">
          Avg {formatCount(midrange)}
        </div>
      ) : null}
      {width > 0 ? (
        <BarChart
          width={width}
          height={CHART_HEIGHT}
          data={data}
          margin={{ top: 24, right: 8, left: 0, bottom: 0 }}
        >
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            width={56}
            allowDecimals={false}
            tickFormatter={(value) => formatCount(Number(value))}
          />
          <Tooltip
            formatter={(value) => [formatCount(Number(value)), "Footfall"]}
            labelStyle={{ color: "var(--foreground)" }}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
            }}
          />
          {midrange !== null ? (
            <ReferenceLine
              y={midrange}
              stroke="oklch(0.55 0.12 25)"
              strokeWidth={2.5}
            />
          ) : null}
          <Bar
            dataKey="count"
            fill="oklch(0.52 0.09 160)"
            radius={[6, 6, 0, 0]}
          >
            <LabelList
              dataKey="count"
              position="top"
              formatter={(value) => formatCount(Number(value))}
              style={{
                fill: "var(--foreground)",
                fontSize: 11,
                fontWeight: 600,
              }}
            />
          </Bar>
        </BarChart>
      ) : null}
    </div>
  );
}
