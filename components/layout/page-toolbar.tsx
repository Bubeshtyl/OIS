"use client";

import Link from "next/link";
import { ChevronDown, LogOut } from "lucide-react";
import { logoutAction } from "@/lib/auth/actions";
import { DateRangePicker } from "@/components/layout/date-range-picker";
import type { UserRole } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function PageToolbar({
  name,
  role,
  startDate,
  endDate,
  defaultStart,
  defaultEnd,
  extraParams,
}: {
  name: string;
  role: UserRole;
  startDate?: string;
  endDate?: string;
  defaultStart?: string;
  defaultEnd?: string;
  extraParams?: Record<string, string>;
}) {
  return (
    <div className="flex items-center gap-2">
      {startDate && endDate && defaultStart && defaultEnd && (
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          defaultStart={defaultStart}
          defaultEnd={defaultEnd}
          extraParams={extraParams}
        />
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 bg-card px-2 shadow-sm"
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {initials(name)}
              </span>
              <span className="hidden max-w-28 truncate sm:inline">
                {name}
              </span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-1">
              <span>{name}</span>
              <span className="text-xs text-muted-foreground">{role}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {role === "ADMIN" && (
            <>
              <DropdownMenuItem
                render={<Link href="/admin/products">Oil Products</Link>}
              />
              <DropdownMenuItem
                render={<Link href="/admin/users">Managers</Link>}
              />
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            render={
              <form action={logoutAction} className="w-full">
                <button
                  type="submit"
                  className="flex w-full items-center gap-2"
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </form>
            }
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
