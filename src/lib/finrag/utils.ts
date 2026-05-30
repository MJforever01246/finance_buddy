import type { FinRagDocument } from "./client";

export function formatReportPeriod(doc: {
  report_period?: string | null;
  fiscal_year?: number | null;
  fiscal_quarter?: number | null;
}): string {
  if (doc.report_period) return doc.report_period;
  const parts: string[] = [];
  if (doc.fiscal_year) parts.push(String(doc.fiscal_year));
  if (doc.fiscal_quarter) parts.push(`Q${doc.fiscal_quarter}`);
  return parts.join(" · ") || "—";
}

const STATUS_LABELS: Record<string, string> = {
  uploaded: "Đã tải lên",
  queued: "Chờ xử lý",
  downloading: "Đang tải",
  extracting_text: "Trích xuất",
  extracting_tables: "Trích bảng",
  chunking: "Chia đoạn",
  embedding: "Embedding",
  indexed: "Đang lưu",
  ready: "Sẵn sàng",
  failed: "Lỗi",
};

export function finragStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function finragStatusClass(status: string): string {
  switch (status) {
    case "ready":
      return "bg-emerald-500/15 text-emerald-800 ring-emerald-500/30 dark:text-emerald-300";
    case "failed":
      return "bg-red-500/15 text-red-800 ring-red-500/30 dark:text-red-300";
    case "queued":
    case "uploaded":
      return "bg-amber-500/15 text-amber-900 ring-amber-500/30 dark:text-amber-200";
    default:
      return "bg-sky-500/15 text-sky-900 ring-sky-500/30 dark:text-sky-200";
  }
}

export function finragDocumentStats(documents: FinRagDocument[]) {
  return {
    total: documents.length,
    ready: documents.filter((d) => d.status === "ready").length,
    processing: documents.filter((d) => !["ready", "failed"].includes(d.status))
      .length,
    failed: documents.filter((d) => d.status === "failed").length,
    chunks: documents.reduce((s, d) => s + (d.processed_chunks || 0), 0),
  };
}
