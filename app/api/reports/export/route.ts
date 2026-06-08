import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/auth/rbac";
import { getSession } from "@/lib/auth/session";
import {
  defaultRangeEnd,
  defaultRangeStart,
  isValidDateString,
  normalizeDateRange,
} from "@/lib/date-range";
import {
  buildReportsWorkbook,
  workbookToBuffer,
} from "@/lib/reports/build-workbook";
import { loadAllReportsData } from "@/lib/reports/load-all-reports";
import { getIstTodayString } from "@/lib/timezone";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn || !hasPermission(session.role, "reports:read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const today = getIstTodayString();
  const defaultStart = defaultRangeStart(today);
  const defaultEnd = defaultRangeEnd(today);
  const startParam = searchParams.get("start") ?? undefined;
  const endParam = searchParams.get("end") ?? undefined;
  const { start, end } = normalizeDateRange(
    isValidDateString(startParam) ? startParam : defaultStart,
    isValidDateString(endParam) ? endParam : defaultEnd
  );

  const data = await loadAllReportsData(start, end);
  const workbook = buildReportsWorkbook(data, start, end);
  const buffer = workbookToBuffer(workbook);
  const filename = `ois-reports-${start}-to-${end}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
