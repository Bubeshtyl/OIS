"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Container, LayoutGrid, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashboardLocation = "all" | "depot" | "manager";

const TABS: Array<{
  value: DashboardLocation;
  label: string;
  icon: LucideIcon;
  activeClass: string;
  activeIcon: string;
}> = [
  {
    value: "all",
    label: "All",
    icon: LayoutGrid,
    activeClass:
      "bg-card text-foreground shadow-sm ring-1 ring-primary/25",
    activeIcon: "bg-primary/10 text-primary",
  },
  {
    value: "depot",
    label: "Depot",
    icon: Container,
    activeClass:
      "bg-card text-emerald-800 shadow-sm ring-1 ring-emerald-200",
    activeIcon: "bg-emerald-100 text-emerald-700",
  },
  {
    value: "manager",
    label: "Manager",
    icon: Users,
    activeClass: "bg-card text-sky-800 shadow-sm ring-1 ring-sky-200",
    activeIcon: "bg-sky-100 text-sky-700",
  },
];

export function DashboardLocationTabs({
  location = "all",
  className,
}: {
  location?: DashboardLocation;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(next: DashboardLocation) {
    const params = new URLSearchParams(searchParams.toString());

    if (next === "all") {
      params.delete("location");
    } else {
      params.set("location", next);
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div
      role="tablist"
      aria-label="Stock location"
      className={cn(
        "grid h-9 w-full min-w-0 grid-cols-3 gap-1 rounded-lg border border-border bg-card p-1 shadow-sm",
        className
      )}
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = location === tab.value;

        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => handleChange(tab.value)}
            className={cn(
              "inline-flex h-full min-w-0 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-semibold transition-all",
              isActive
                ? tab.activeClass
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-md transition-colors",
                isActive ? tab.activeIcon : "bg-muted text-muted-foreground"
              )}
            >
              <Icon className="size-3.5" />
            </span>
            <span className="truncate">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
