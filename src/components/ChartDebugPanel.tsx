"use client";

import { useEffect, useState } from "react";
import {
  getChartDebugSnapshot,
  subscribeChartDebug,
  type ChartDebugSnapshot,
} from "@/lib/chart/debug";

const SOURCE_LABEL: Record<ChartDebugSnapshot["source"], string> = {
  sqlite: "SQLite (crawl)",
  vps: "VPS API",
  json: "JSON mẫu",
  "json-fallback-all": "JSON (fallback range)",
  none: "Không có dữ liệu",
  error: "Lỗi",
};

export function ChartDebugPanel() {
  const [open, setOpen] = useState(true);
  const [snap, setSnap] = useState<ChartDebugSnapshot>(() => getChartDebugSnapshot());

  useEffect(() => subscribeChartDebug(setSnap), []);

  const ok = snap.barCount > 0 && snap.source !== "error";
  const warn = snap.noData || snap.source === "none" || snap.source === "error";

  return (
    <div className="border-t border-[var(--border)] bg-[var(--surface-2)] text-[10px] text-[var(--muted)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-[var(--surface)]"
      >
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            ok ? "bg-emerald-500" : warn ? "bg-amber-500" : "bg-[var(--muted)]"
          }`}
        />
        <span className="font-medium text-[var(--text)]">Debug datafeed</span>
        <span className="truncate">
          {snap.symbol || "—"} · {snap.barCount} bars · {SOURCE_LABEL[snap.source]}
        </span>
        <span className="ml-auto shrink-0">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <dl className="grid gap-1 border-t border-[var(--border)] px-3 py-2 font-mono leading-relaxed">
          <Row k="Nguồn" v={SOURCE_LABEL[snap.source]} />
          <Row k="Bars" v={String(snap.barCount)} highlight={snap.barCount === 0} />
          <Row k="Resolution" v={snap.resolution || "—"} />
          <Row k="from → to (sec)" v={`${snap.fromSec} → ${snap.toSec}`} />
          <Row k="Bar dates" v={`${snap.firstBarTime ?? "—"} … ${snap.lastBarTime ?? "—"}`} />
          <Row k="Chi tiết" v={snap.detail || "—"} />
          {snap.error && <Row k="Lỗi" v={snap.error} highlight />}
          <Row
            k="Console"
            v="F12 → filter [TV datafeed] · widget debug=dev"
          />
          {snap.at && <Row k="Cập nhật" v={snap.at.slice(11, 19)} />}
        </dl>
      )}
    </div>
  );
}

function Row({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2">
      <dt className="text-[var(--muted)]">{k}</dt>
      <dd className={highlight ? "text-rose-600 dark:text-rose-400" : "text-[var(--text)]"}>{v}</dd>
    </div>
  );
}
