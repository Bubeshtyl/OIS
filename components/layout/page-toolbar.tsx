"use client";

import { DateRangePicker } from "@/components/layout/date-range-picker";

export function PageToolbar({
  startDate,
  endDate,
  defaultStart,
  defaultEnd,
  extraParams,
}: {
  startDate: string;
  endDate: string;
  defaultStart: string;
  defaultEnd: string;
  extraParams?: Record<string, string>;
}) {
  return (
    <div className="w-full shrink-0 sm:w-auto sm:max-w-[11.5rem]">
      <DateRangePicker
        startDate={startDate}
        endDate={endDate}
        defaultStart={defaultStart}
        defaultEnd={defaultEnd}
        extraParams={extraParams}
        className="h-9 w-full min-w-0 gap-2 bg-card shadow-sm"
      />
    </div>
  );
}
