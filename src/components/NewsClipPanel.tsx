"use client";

import { useState } from "react";
import { useDemoStore } from "@/stores/demo-store";

export function NewsClipPanel() {
  const newsLinks = useDemoStore((s) => s.newsLinks);
  const addNewsClip = useDemoStore((s) => s.addNewsClip);
  const addNewsDemo = useDemoStore((s) => s.addNewsDemo);
  const importNewsBulk = useDemoStore((s) => s.importNewsBulk);
  const clearPersistedDemoData = useDemoStore((s) => s.clearPersistedDemoData);

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [preview, setPreview] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  async function copyText(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setHint("Đã copy vào clipboard.");
      setTimeout(() => setCopiedId(null), 1500);
      setTimeout(() => setHint(null), 2500);
    } catch {
      setHint("Không copy được — trình duyệt chặn.");
    }
  }

  return (
    <div className="flex h-full min-h-[280px] flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--text)]">Tin — link & xem trước</h2>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          Một dòng một link; hoặc{" "}
          <code className="rounded bg-[var(--surface-2)] px-1">URL | tiêu đề | preview</code> / tab
          giữa 3 cột. Copy nhanh từng bài.
        </p>
      </div>

      <div className="border-b border-[var(--border)] p-4">
        <p className="text-[11px] font-medium text-[var(--text)]">Import hàng loạt</p>
        <textarea
          placeholder={`https://vnexpress.net/bai-a\nhttps://tuoitre.vn/bai-b|Tiêu đề tùy|Đoạn preview ngắn`}
          rows={4}
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          className="mt-2 w-full resize-y rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 font-mono text-[11px] leading-relaxed text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const n = importNewsBulk(bulkText);
              if (n > 0) {
                setBulkText("");
                setHint(`Đã import ${n} link.`);
                setTimeout(() => setHint(null), 2500);
              } else {
                setHint("Không parse được dòng nào — kiểm tra URL (https…).");
                setTimeout(() => setHint(null), 3000);
              }
            }}
            className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500"
          >
            Import từ khối văn bản
          </button>
          <button
            type="button"
            onClick={() => {
              if (
                typeof window !== "undefined" &&
                !window.confirm("Xóa toàn bộ tin + reset giá/portfolio demo trong trình duyệt?")
              ) {
                return;
              }
              clearPersistedDemoData();
              setHint("Đã xóa dữ liệu local & reset demo.");
              setTimeout(() => setHint(null), 2500);
            }}
            className="rounded-lg px-3 py-1.5 text-xs text-rose-600 ring-1 ring-rose-500/30 hover:bg-rose-500/10 dark:text-rose-400"
          >
            Xóa dữ liệu local
          </button>
        </div>
      </div>

      <div className="grid gap-3 border-b border-[var(--border)] p-4 sm:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <input
            type="url"
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          <input
            type="text"
            placeholder="Tiêu đề (tùy chọn)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          <textarea
            placeholder="Preview ngắn (tùy chọn, 1–3 dòng)"
            rows={2}
            value={preview}
            onChange={(e) => setPreview(e.target.value)}
            className="w-full resize-none rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs leading-relaxed text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <button
            type="button"
            disabled={!url.trim()}
            onClick={() => {
              const u = url.trim();
              try {
                new URL(u);
              } catch {
                setHint("URL không hợp lệ (cần có https://...).");
                setTimeout(() => setHint(null), 3000);
                return;
              }
              let t = title.trim();
              if (!t) {
                try {
                  t = new URL(u).hostname.replace(/^www\./, "");
                } catch {
                  t = "Link";
                }
              }
              addNewsClip({
                url: u,
                title: t,
                preview: preview.trim() || undefined,
              });
              setUrl("");
              setTitle("");
              setPreview("");
              setHint("Đã lưu vào danh sách.");
              setTimeout(() => setHint(null), 2000);
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-40"
          >
            Lưu clip
          </button>
          <button
            type="button"
            onClick={() => addNewsDemo()}
            className="text-xs text-[var(--muted)] underline-offset-2 hover:text-[var(--text)] hover:underline"
          >
            + Thêm tin demo có sẵn
          </button>
        </div>
      </div>

      {hint ? <p className="px-4 py-1 text-xs text-emerald-600 dark:text-emerald-400">{hint}</p> : null}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
        {newsLinks.map((n) => (
          <article
            key={n.id}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="line-clamp-2 text-sm font-medium leading-snug text-[var(--text)]">
                {n.title}
              </h3>
              <button
                type="button"
                onClick={() => copyText(n.url, n.id)}
                className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-medium ring-1 transition-colors ${
                  copiedId === n.id
                    ? "bg-emerald-500/20 text-emerald-700 ring-emerald-500/40 dark:text-emerald-300"
                    : "bg-[var(--surface)] text-[var(--muted)] ring-[var(--border)] hover:text-[var(--text)]"
                }`}
              >
                {copiedId === n.id ? "Đã copy" : "Copy link"}
              </button>
            </div>
            <p className="mt-1 truncate font-mono text-[10px] text-[var(--muted)]">{n.url}</p>
            {n.preview ? (
              <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[var(--muted)]">
                {n.preview}
              </p>
            ) : null}
          </article>
        ))}
        {!newsLinks.length ? (
          <p className="text-center text-sm text-[var(--muted)]">Chưa có tin — lưu clip hoặc tin demo.</p>
        ) : null}
      </div>
    </div>
  );
}
