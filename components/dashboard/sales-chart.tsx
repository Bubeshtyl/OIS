"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function SalesChart({
  data,
}: {
  data: Array<{ label: string; quantity: number }>;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return <div className="h-48 w-full min-w-0 shrink-0" aria-hidden />;
  }

  return (
    <div className="h-48 w-full min-w-0 shrink-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            width={32}
          />
          <Tooltip formatter={(value) => [`${value} packets`, "Sold"]} />
          <Bar
            dataKey="quantity"
            fill="oklch(0.47 0.075 198)"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
