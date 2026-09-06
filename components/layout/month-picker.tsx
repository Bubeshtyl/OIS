"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatMonthLabel } from "@/lib/date-range";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function parseMonth(month: string) {
  return {
    year: Number(month.slice(0, 4)),
    monthIndex: Number(month.slice(5, 7)) - 1,
  };
}

function toMonthString(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export function MonthPicker({
  month,
  defaultMonth,
  extraParams,
  className,
}: {
  month: string;
  defaultMonth: string;
  extraParams?: Record<string, string>;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const selected = parseMonth(month);
  const [viewYear, setViewYear] = useState(selected.year);

  const isDefault = month === defaultMonth;

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setViewYear(parseMonth(month).year);
    }
    setOpen(nextOpen);
  }

  function pushMonth(nextMonth: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (extraParams) {
      for (const [key, value] of Object.entries(extraParams)) {
        params.set(key, value);
      }
    }

    params.delete("start");
    params.delete("end");
    params.delete("page");

    if (nextMonth !== defaultMonth) {
      params.set("month", nextMonth);
    } else {
      params.delete("month");
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={
              className ??
              "h-11 w-full min-w-0 justify-start gap-2 bg-card font-normal shadow-sm"
            }
          >
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 truncate">{formatMonthLabel(month)}</span>
          </Button>
        }
      />
      <PopoverContent align="end" className="w-[17.5rem] p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Previous year"
            onClick={() => setViewYear((year) => year - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-semibold tabular-nums">{viewYear}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Next year"
            onClick={() => setViewYear((year) => year + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {MONTH_NAMES.map((label, monthIndex) => {
            const value = toMonthString(viewYear, monthIndex);
            const isSelected = value === month;
            return (
              <Button
                key={value}
                type="button"
                variant={isSelected ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-9 justify-center font-medium",
                  !isSelected && "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => pushMonth(value)}
              >
                {label}
              </Button>
            );
          })}
        </div>

        {!isDefault ? (
          <div className="mt-3 border-t pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => pushMonth(defaultMonth)}
            >
              Reset to this month
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
