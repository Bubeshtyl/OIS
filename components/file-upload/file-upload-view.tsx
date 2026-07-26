"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileUp, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPT =
  ".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";

type UploadResult = {
  kind: "success";
  inserted: number;
  updated: number;
  total: number;
  skipped: number;
  durationMs: number;
  fileName: string;
};

type UploadError = {
  kind: "error";
  message: string;
  fileName?: string;
};

type Feedback = UploadResult | UploadError;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isExcelFile(file: File) {
  const lower = file.name.toLowerCase();
  return lower.endsWith(".xlsx") || lower.endsWith(".xls");
}

export function FileUploadView() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  function selectFile(list: FileList | null) {
    if (!list?.length) return;
    const next = list[0];
    if (!isExcelFile(next)) {
      const message = "Only .xlsx and .xls Excel files are supported.";
      setFeedback({ kind: "error", message });
      toast.error(message);
      return;
    }
    setFeedback(null);
    setFile(next);
  }

  async function handleUpload() {
    if (!file || uploading) return;

    setUploading(true);
    setFeedback(null);
    const fileName = file.name;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/daily-sales/upload", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        inserted?: number;
        updated?: number;
        total?: number;
        skipped?: number;
        durationMs?: number;
      } | null;

      if (!response.ok) {
        const message =
          payload?.error ??
          (response.status === 413
            ? "File is too large."
            : `Upload failed (${response.status}).`);
        setFeedback({ kind: "error", message, fileName });
        toast.error(message, { duration: 8000 });
        return;
      }

      if (
        payload == null ||
        typeof payload.total !== "number" ||
        typeof payload.inserted !== "number" ||
        typeof payload.updated !== "number"
      ) {
        const message = "Upload finished but the server returned an unexpected response.";
        setFeedback({ kind: "error", message, fileName });
        toast.error(message, { duration: 8000 });
        return;
      }

      const result: UploadResult = {
        kind: "success",
        inserted: payload.inserted,
        updated: payload.updated,
        total: payload.total,
        skipped: payload.skipped ?? 0,
        durationMs: payload.durationMs ?? 0,
        fileName,
      };

      setFeedback(result);
      toast.success(
        `Loaded ${result.total.toLocaleString()} rows — ${result.inserted.toLocaleString()} new, ${result.updated.toLocaleString()} updated`,
        { duration: 8000 }
      );
      setFile(null);
    } catch {
      const message = "Upload failed. Please try again.";
      setFeedback({ kind: "error", message, fileName });
      toast.error(message, { duration: 8000 });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={uploading ? -1 : 0}
        aria-disabled={uploading}
        onKeyDown={(event) => {
          if (uploading) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => {
          if (!uploading) inputRef.current?.click();
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!uploading) setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!uploading) setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!uploading) selectFile(event.dataTransfer.files);
        }}
        className={cn(
          "flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-16 text-center transition-colors",
          uploading && "pointer-events-none opacity-60",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border/80 bg-muted/30 hover:border-border hover:bg-muted/50"
        )}
      >
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-border/60">
          {uploading ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="size-5 text-muted-foreground" />
          )}
        </div>
        <p className="text-lg font-medium tracking-tight">
          {uploading
            ? "Uploading and loading rows…"
            : "Drop an Excel file here or click to browse"}
        </p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {uploading
            ? "Large files can take up to a minute. Keep this page open until you see a confirmation."
            : "Upload a daily sales export (.xlsx / .xls). Rows are upserted by Receipt No into daily_sales."}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          disabled={uploading}
          onChange={(event) => {
            selectFile(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {file && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl border bg-background px-4 py-3">
            <FileUp className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(file.size)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`Remove ${file.name}`}
              disabled={uploading}
              onClick={() => setFile(null)}
            >
              <X />
            </Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              onClick={() => setFile(null)}
            >
              Clear
            </Button>
            <Button type="button" disabled={uploading} onClick={handleUpload}>
              {uploading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Uploading…
                </>
              ) : (
                "Upload"
              )}
            </Button>
          </div>
        </div>
      )}

      {feedback?.kind === "success" && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-50"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="min-w-0 space-y-1">
              <p className="font-medium tracking-tight">
                File loaded successfully
              </p>
              <p className="text-sm opacity-90">
                <span className="font-medium">{feedback.fileName}</span>
                {" — "}
                {feedback.total.toLocaleString()} rows loaded
                {" ("}
                {feedback.inserted.toLocaleString()} new,{" "}
                {feedback.updated.toLocaleString()} updated
                {feedback.skipped > 0
                  ? `, ${feedback.skipped.toLocaleString()} skipped`
                  : ""}
                {")"}
                {" in "}
                {(feedback.durationMs / 1000).toFixed(1)}s.
              </p>
            </div>
          </div>
        </div>
      )}

      {feedback?.kind === "error" && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-4 text-destructive"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 space-y-1">
              <p className="font-medium tracking-tight">Upload failed</p>
              <p className="text-sm opacity-90">
                {feedback.fileName ? (
                  <>
                    <span className="font-medium">{feedback.fileName}</span>
                    {" — "}
                  </>
                ) : null}
                {feedback.message}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
