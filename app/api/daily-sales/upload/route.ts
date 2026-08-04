import { gunzipSync } from "node:zlib";
import { NextRequest, NextResponse } from "next/server";
import { hasPermission } from "@/lib/auth/rbac";
import { getOptionalTenantSession } from "@/lib/auth/permissions";
import {
  DailySalesParseError,
  parseDailySalesWorkbook,
} from "@/lib/daily-sales/parse-workbook";
import { upsertDailySales } from "@/lib/daily-sales/upsert";
import { recordDailySalesUpload } from "@/lib/queries/daily-sales";

export const maxDuration = 300;

/** Uncompressed workbook/CSV size after optional gzip decode. */
const MAX_FILE_BYTES = 25 * 1024 * 1024;
/**
 * Vercel Functions reject request bodies over ~4.5MB (413). Keep a headroom
 * under that for multipart framing; clients should gzip large CSVs.
 */
const MAX_REQUEST_PAYLOAD_BYTES = 4 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

function hasAllowedExtension(name: string) {
  const lower = name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
}

export async function POST(request: NextRequest) {
  const started = Date.now();

  try {
    const session = await getOptionalTenantSession();
    if (!session || !(await hasPermission(session, "file-upload:read"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const encoding = formData.get("encoding");

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

    if (file.size > MAX_REQUEST_PAYLOAD_BYTES) {
      return NextResponse.json(
        {
          error:
            "Upload payload is too large for the server (max ~4MB after compression). Try a smaller date range or CSV instead of Excel.",
        },
        { status: 413 }
      );
    }

    const raw = Buffer.from(await file.arrayBuffer());
    let bytes: Uint8Array = raw;

    if (encoding === "gzip") {
      try {
        bytes = gunzipSync(raw);
      } catch {
        return NextResponse.json(
          { error: "Failed to decompress gzipped upload." },
          { status: 400 }
        );
      }
    }

    if (bytes.byteLength > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "File is too large. Maximum uncompressed size is 25MB." },
        { status: 400 }
      );
    }

    const parsed = parseDailySalesWorkbook(toArrayBuffer(bytes), file.name);
    const result = await upsertDailySales(session.tenantId, parsed.rows);

    await recordDailySalesUpload({
      tenantId: session.tenantId,
      fileName: file.name,
      uploadedBy: session.userId || null,
      inserted: result.inserted,
      updated: result.updated,
      total: result.total,
      skipped: parsed.skipped,
    });

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
