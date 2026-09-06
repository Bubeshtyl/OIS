"use client";

import { MonthPicker } from "@/components/layout/month-picker";

export function MonthToolbar({
  month,
  defaultMonth,
  extraParams,
}: {
  month: string;
  defaultMonth: string;
  extraParams?: Record<string, string>;
}) {
  return (
    <div className="w-full shrink-0 sm:w-auto sm:max-w-[12.5rem]">
      <MonthPicker
        month={month}
        defaultMonth={defaultMonth}
        extraParams={extraParams}
        className="h-9 w-full min-w-0 gap-2 bg-card shadow-sm"
      />
    </div>
  );
}
