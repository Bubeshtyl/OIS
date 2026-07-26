import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/auth/rbac";
import { getSession } from "@/lib/auth/session";
import {
  DailySalesParseError,
  parseDailySalesWorkbook,
} from "@/lib/daily-sales/parse-workbook";
import { upsertDailySales } from "@/lib/daily-sales/upsert";

export const maxDuration = 300;

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

function hasAllowedExtension(name: string) {
  const lower = name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export async function POST(request: NextRequest) {
  const started = Date.now();

  try {
    const session = await getSession();
    if (
      !session.isLoggedIn ||
      !(await hasPermission(session.role, "file-upload:read"))
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error:
            'Missing file. Upload a single Excel or CSV file as field "file".',
        },
        { status: 400 }
      );
    }

    if (!hasAllowedExtension(file.name)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only .xlsx, .xls, and .csv files are allowed.",
        },
        { status: 400 }
      );
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: "File is empty." }, { status: 400 });
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "File is too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const parsed = parseDailySalesWorkbook(buffer, file.name);
    const result = await upsertDailySales(parsed.rows);

    return NextResponse.json({
      inserted: result.inserted,
      updated: result.updated,
      total: result.total,
      skipped: parsed.skipped,
      duplicatesCollapsed: parsed.duplicatesCollapsed,
      durationMs: Date.now() - started,
    });
  } catch (error) {
    if (error instanceof DailySalesParseError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("daily-sales upload failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load daily sales file",
      },
      { status: 500 }
    );
  }
}
