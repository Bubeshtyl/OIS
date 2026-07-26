import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/auth/rbac";
import { getSession } from "@/lib/auth/session";
import {
  buildDailySalesWorkbook,
  dailySalesWorkbookToBuffer,
} from "@/lib/daily-sales/build-workbook";
import { parseDailySalesFilters } from "@/lib/daily-sales/filters";
import { getDailySalesExportRows } from "@/lib/queries/daily-sales";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (
    !session.isLoggedIn ||
    !(await hasPermission(session.role, "daily-sales:read"))
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const filters = parseDailySalesFilters(params);

  if (!filters.applied) {
    return NextResponse.json(
      { error: "Apply filters before exporting." },
      { status: 400 }
    );
  }

  const rows = await getDailySalesExportRows(filters);
  const workbook = buildDailySalesWorkbook(rows);
  const buffer = dailySalesWorkbookToBuffer(workbook);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `daily-sales-${stamp}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
