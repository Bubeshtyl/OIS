import Link from "next/link";
import { ClipboardCheck, Droplet, SquareArrowDown, SquareArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

const actions = [
  {
    href: "/receive",
    label: "Stock Received",
    icon: SquareArrowDown,
    iconClass: "text-emerald-600",
    bgClass: "bg-emerald-50",
  },
  {
    href: "/transfer",
    label: "Stock Issued",
    icon: SquareArrowUp,
    iconClass: "text-sky-600",
    bgClass: "bg-sky-50",
  },
  {
    href: "/sales",
    label: "Daily Consumption",
    icon: Droplet,
    iconClass: "text-orange-600",
    bgClass: "bg-orange-50",
  },
  {
    href: "/reports",
    label: "Reports",
    icon: ClipboardCheck,
    iconClass: "text-violet-600",
    bgClass: "bg-violet-50",
  },
] as const;

export function QuickActionTiles() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center gap-3 rounded-xl border-0 bg-card p-4 shadow-sm transition-colors hover:bg-muted/40"
          >
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-lg",
                action.bgClass
              )}
            >
              <Icon className={cn("size-5", action.iconClass)} />
            </div>
            <span className="text-sm font-medium">{action.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
