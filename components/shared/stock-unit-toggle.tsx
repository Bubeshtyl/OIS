"use client";

import type { StockDisplayUnit } from "@/lib/format";
import { cn } from "@/lib/utils";

const OPTIONS: Array<{ value: StockDisplayUnit; label: string }> = [
  { value: "packets", label: "Packets" },
  { value: "litres", label: "Litres" },
];

export function StockUnitToggle({
  unit = "packets",
  onChange,
  className,
}: {
  unit?: StockDisplayUnit;
  onChange: (unit: StockDisplayUnit) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Display unit"
      className={cn(
        "inline-grid h-8 w-auto shrink-0 grid-cols-2 gap-0.5 rounded-md border border-border bg-card p-0.5 shadow-sm [&_button]:min-h-0",
        className
      )}
    >
      {OPTIONS.map((option) => {
        const isActive = unit === option.value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-full min-w-0 items-center justify-center rounded-[calc(var(--radius)-2px)] px-2 text-xs font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
