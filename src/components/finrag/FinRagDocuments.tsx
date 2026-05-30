"use client";

import { DragEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { finragApi, FinRagError, type FinRagDocument } from "@/lib/finrag/client";
import {
  finragDocumentStats,
  finragStatusClass,
  finragStatusLabel,
  formatReportPeriod,
} from "@/lib/finrag/utils";

type Props = {
  apiOnline: boolean;
  inDesktop: boolean;
  onStatsChange?: (stats: ReturnType<typeof finragDocumentStats>) => void;
};

export function FinRagDocuments({ apiOnline, inDesktop, onStatsChange }: Props) {
  const [documents, setDocuments] = useState<FinRagDocument[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploadMode, setUploadMode] = useState<"url" | "file">("file");
  const [form, setForm] = useState({
    source_url: "",
    title: "",
    ticker: "",
    fiscal_year: "",
    fiscal_quarter: "",
    report_type: "BCTC",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const docs = await finragApi.listDocuments(100);
    setDocuments(docs);
    onStatsChange?.(finragDocumentStats(docs));
  }, [onStatsChange]);

  useEffect(() => {
    if (!apiOnline) {
      setLoading(false);
      return;
    }
    refresh()
      .catch((e) => setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu"))
      .finally(() => setLoading(false));
  }, [apiOnline, refresh]);

  useEffect(() => {
    const hasActive = documents.some((d) => !["ready", "failed"].includes(d.status));
    if (!hasActive || !apiOnline) return;
    const t = setInterval(() => {
      refresh().catch(() => {});
    }, 3000);
    return () => clearInterval(t);
  }, [documents, apiOnline, refresh]);

  const filtered = filter ? documents.filter((d) => d.status === filter) : documents;
  const stats = finragDocumentStats(documents);

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function onDragLeave(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext && ["pdf", "xlsx", "xls", "csv", "docx", "txt", "html", "htm"].includes(ext)) {
      setSelectedFile(file);
      setUploadMode("file");
    } else {
      setError("Loại file không hỗ trợ: PDF, XLSX, DOCX, CSV, TXT, HTML");
    }
  }

  function resetForm() {
    setForm({
      source_url: "",
      title: "",
      ticker: "",
      fiscal_year: "",
      fiscal_quarter: "",
      report_type: "BCTC",
    });
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (uploadMode === "file") {
        if (!selectedFile) {
          setError("Chưa chọn file");
          return;
        }
        await finragApi.uploadDocument(selectedFile, {
          title: form.title.trim() || undefined,
          ticker: form.ticker.trim() || undefined,
          report_type: form.report_type || undefined,
          fiscal_year: form.fiscal_year || undefined,
          fiscal_quarter: form.fiscal_quarter || undefined,
        });
      } else {
        if (!form.source_url.trim()) {
          setError("Chưa nhập URL");
          return;
        }
        setError("Upload qua URL chưa hỗ trợ trên Rust — dùng tab Upload file (.txt / .pdf)");
        return;
      }
      resetForm();
      setShowForm(false);
      await refresh();
    } catch (err) {
      setError(err instanceof FinRagError ? err.message : "Không thêm được báo cáo");
    } finally {
      setSubmitting(false);
    }
  }

  if (!apiOnline) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-[var(--muted)]">
        {inDesktop
          ? "Chờ FinRAG sẵn sàng (Ollama + GEMINI_API_KEY)."
          : "Mở /bctc trong app desktop: npm run desktop:dev"}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)]">Báo cáo đã index</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Xử lý nền trong Rust (chunk + Ollama embed) — lưu SQLite cùng app.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            {showForm ? "Đóng form" : "+ Thêm báo cáo"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Tổng", value: stats.total },
            { label: "Sẵn sàng", value: stats.ready },
            { label: "Đang xử lý", value: stats.processing },
            { label: "Chunks", value: stats.chunks },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"
            >
              <p className="text-[10px] text-[var(--muted)]">{s.label}</p>
              <p className="mt-1 text-xl font-semibold text-[var(--text)]">{s.value}</p>
            </div>
          ))}
        </div>

        {showForm && (
          <form
            onSubmit={onSubmit}
            className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <div className="mb-4 flex gap-1 rounded-lg bg-[var(--surface-2)] p-1">
              <button
                type="button"
                onClick={() => setUploadMode("file")}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
                  uploadMode === "file"
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--muted)]"
                }`}
              >
                Upload file
              </button>
              <button
                type="button"
                onClick={() => setUploadMode("url")}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
                  uploadMode === "url"
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--muted)]"
                }`}
              >
                Link URL
              </button>
            </div>

            {uploadMode === "file" ? (
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 ${
                  dragOver
                    ? "border-[var(--accent)] bg-[var(--accent)]/5"
                    : selectedFile
                      ? "border-emerald-500/50 bg-emerald-500/5"
                      : "border-[var(--border)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.xlsx,.xls,.csv,.docx,.txt,.html,.htm"
                  onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])}
                  className="hidden"
                />
                {selectedFile ? (
                  <p className="text-sm font-medium text-[var(--text)]">{selectedFile.name}</p>
                ) : (
                  <p className="text-sm text-[var(--muted)]">Kéo thả PDF hoặc click chọn file</p>
                )}
              </div>
            ) : (
              <input
                value={form.source_url}
                onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                placeholder="URL PDF báo cáo *"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              />
            )}

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Tiêu đề"
                className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              />
              <input
                value={form.ticker}
                onChange={(e) => setForm({ ...form, ticker: e.target.value })}
                placeholder="Mã CK (FPT, VNM…)"
                className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              />
              <input
                value={form.fiscal_year}
                onChange={(e) => setForm({ ...form, fiscal_year: e.target.value })}
                placeholder="Năm (2025)"
                className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              />
              <input
                value={form.fiscal_quarter}
                onChange={(e) => setForm({ ...form, fiscal_quarter: e.target.value })}
                placeholder="Quý (1-4)"
                className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={
                submitting ||
                (uploadMode === "file" && !selectedFile) ||
                (uploadMode === "url" && !form.source_url.trim())
              }
              className="mt-4 rounded-lg bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {submitting ? "Đang tải…" : uploadMode === "file" ? "Upload & xử lý" : "Thêm vào hàng đợi"}
            </button>
          </form>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {["", "ready", "failed", "queued"].map((s) => (
            <button
              key={s || "all"}
              type="button"
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1 text-xs ${
                filter === s
                  ? "bg-[var(--accent)]/15 text-[var(--accent)] ring-1 ring-[var(--accent)]/30"
                  : "bg-[var(--surface-2)] text-[var(--muted)]"
              }`}
            >
              {s === "" ? "Tất cả" : finragStatusLabel(s)}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}

        {loading ? (
          <p className="mt-8 text-center text-[var(--muted)]">Đang tải…</p>
        ) : filtered.length === 0 ? (
          <p className="mt-8 text-center text-[var(--muted)]">Chưa có báo cáo.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {filtered.map((doc) => {
              return (
                <li
                  key={doc.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[var(--text)]">
                        {doc.ticker && (
                          <span className="mr-2 text-[var(--accent)]">{doc.ticker}</span>
                        )}
                        {doc.title ?? doc.original_filename ?? "Báo cáo"}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {formatReportPeriod(doc)} · {doc.report_type ?? "—"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs ring-1 ${finragStatusClass(doc.status)}`}
                    >
                      {finragStatusLabel(doc.status)}
                    </span>
                  </div>
                  {doc.status !== "ready" && doc.status !== "failed" && (
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-xs text-[var(--muted)]">
                        <span>{doc.current_step ?? doc.status}</span>
                        <span>{doc.progress}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                        <div
                          className="h-full rounded-full bg-[var(--accent)] transition-all"
                          style={{ width: `${doc.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Chunks: {doc.processed_chunks}/{doc.total_chunks || "—"}
                    {doc.error_message && (
                      <span className="ml-2 text-red-600 dark:text-red-400">
                        {doc.error_message.slice(0, 100)}
                      </span>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
