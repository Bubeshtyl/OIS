import type { LucideIcon } from "lucide-react";
import { Sparkline } from "@/components/dashboard/sparkline";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  subtitle,
  icon: Icon,
  iconClassName,
  sparkline,
  sparklineColor,
  valueClassName,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  iconClassName: string;
  sparkline?: number[];
  sparklineColor: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border-0 bg-card p-4 shadow-sm">
      <div className="space-y-2">
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-lg",
            iconClassName
          )}
        >
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className={cn("text-2xl font-bold tracking-tight", valueClassName)}>
            {value}
          </p>
          {subtitle ? (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {sparkline && sparkline.length > 1 && (
        <Sparkline
          points={sparkline}
          color={sparklineColor}
          className="h-8 w-20 opacity-80"
        />
      )}
    </div>
  );
}
