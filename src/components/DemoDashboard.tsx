"use client";

import { useMemo } from "react";
import { useDemoStore } from "@/stores/demo-store";
import { ChartsIndicatorsPanel } from "./ChartsIndicatorsPanel";
import { DesktopPing } from "./DesktopPing";
import { LiveFeedBridge } from "./LiveFeedBridge";
import { MarketBoardTable } from "./MarketBoardTable";
import { MarketHeader } from "./MarketHeader";
import { NewsClipPanel } from "./NewsClipPanel";
import { SymbolDetailPanel } from "./SymbolDetailPanel";
import { ThemeToggle } from "./ThemeToggle";

const layerBadge: Record<string, string> = {
  data: "bg-emerald-500/15 text-emerald-800 ring-emerald-500/25 dark:text-emerald-300 dark:ring-emerald-500/30",
  intelligence:
    "bg-amber-500/15 text-amber-900 ring-amber-500/25 dark:text-amber-200 dark:ring-amber-500/30",
  communication:
    "bg-sky-500/15 text-sky-900 ring-sky-500/25 dark:text-sky-200 dark:ring-sky-500/30",
};

export function DemoDashboard() {
  const pipelineLog = useDemoStore((s) => s.pipelineLog);
  const liveFeedConnected = useDemoStore((s) => s.liveFeedConnected);
  const autoTickerOn = useDemoStore((s) => s.autoTickerOn);
  const toast = useDemoStore((s) => s.toast);

  const pushManualTick = useDemoStore((s) => s.pushManualTick);
  const toggleAutoTicker = useDemoStore((s) => s.toggleAutoTicker);
  const importPortfolioDemo = useDemoStore((s) => s.importPortfolioDemo);
  const addNewsDemo = useDemoStore((s) => s.addNewsDemo);
  const clearLog = useDemoStore((s) => s.clearLog);
  const dismissToast = useDemoStore((s) => s.dismissToast);

  const pipelineCount = useMemo(() => pipelineLog.length, [pipelineLog]);

  return (
    <div className="flex min-h-screen flex-col">
      <LiveFeedBridge />
      <MarketHeader />

      <div className="mx-auto flex w-full max-w-[1680px] flex-1 flex-col gap-4 px-3 py-4 sm:px-4">
        <header className="flex flex-col gap-3 border-b border-[var(--border)] pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
              Finance Buddy · bảng điều khiển demo
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-[var(--text)] sm:text-2xl">
              Data → Insight → Action
            </h1>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-[var(--muted)]">
              Bảng giá + chi tiết mã (tỉ lệ cố định trên màn lớn). Tin &amp; giá demo lưu{" "}
              <code className="rounded bg-[var(--surface-2)] px-1">localStorage</code> — xem README.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${
                liveFeedConnected
                  ? "border-emerald-500/40 bg-emerald-500/10 text-[var(--up)]"
                  : "border-[var(--border)] text-[var(--muted)]"
              }`}
              title="WebSocket demo-server"
            >
              WS: {liveFeedConnected ? ":3456" : "tắt"}
            </span>
            <ThemeToggle />
            <button
              type="button"
              onClick={pushManualTick}
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500 sm:text-sm"
            >
              Tick tiếp
            </button>
            <button
              type="button"
              onClick={toggleAutoTicker}
              className={`rounded-lg px-3 py-2 text-xs font-medium ring-1 ring-[var(--border)] hover:bg-[var(--surface-2)] sm:text-sm ${
                autoTickerOn ? "bg-emerald-500/15 text-[var(--up)]" : "text-[var(--text)]"
              }`}
            >
              {autoTickerOn ? "Tắt auto" : "Auto ticker"}
            </button>
            <button
              type="button"
              onClick={importPortfolioDemo}
              className="rounded-lg px-3 py-2 text-xs font-medium text-[var(--text)] ring-1 ring-[var(--border)] hover:bg-[var(--surface-2)] sm:text-sm"
            >
              Import PF
            </button>
            <button
              type="button"
              onClick={addNewsDemo}
              className="rounded-lg px-3 py-2 text-xs font-medium text-[var(--text)] ring-1 ring-[var(--border)] hover:bg-[var(--surface-2)] sm:text-sm"
            >
              Tin demo
            </button>
            <button
              type="button"
              onClick={clearLog}
              className="rounded-lg px-3 py-2 text-xs text-[var(--muted)] hover:text-[var(--text)] sm:text-sm"
            >
              Xóa log
            </button>
          </div>
        </header>

        <DesktopPing />

        <div className="grid min-h-[min(52vh,520px)] w-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.42fr)_minmax(300px,400px)] xl:items-stretch">
          <div className="min-h-0 min-w-0">
            <MarketBoardTable />
          </div>
          <div className="min-h-0 min-w-0 xl:max-w-[420px] xl:justify-self-end xl:w-full">
            <SymbolDetailPanel />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartsIndicatorsPanel />
          <NewsClipPanel />
        </div>

        <details className="rounded-xl border border-[var(--border)] bg-[var(--surface)] open:shadow-sm">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-[var(--text)]">
            Kiến trúc layer & pipeline log
            <span className="ml-2 text-xs font-normal text-[var(--muted)]">
              ({pipelineCount} sự kiện)
            </span>
          </summary>
          <div className="border-t border-[var(--border)] px-4 pb-4 pt-2">
            <pre className="mb-4 overflow-x-auto rounded-lg bg-[var(--surface-2)] p-3 text-[10px] leading-relaxed text-[var(--muted)]">
              {`[Next.js] ← Tauri desktop:dev / trình duyệt
     ↕ invoke (app_ping …)
[src-tauri]
     ↕
[Node WS demo] → ingestExternalTick → Intelligence → Communication`}
            </pre>
            <PipelineLogList entries={pipelineLog} />
          </div>
        </details>
      </div>

      {toast ? (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-lg ring-1 ring-black/5 dark:ring-white/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:text-sky-300">
                Smart alert
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text)]">{toast}</p>
            </div>
            <button
              type="button"
              onClick={dismissToast}
              className="shrink-0 rounded-md px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            >
              Đóng
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PipelineLogList({
  entries,
}: {
  entries: import("@/lib/layers/shared/types").PipelineLogEntry[];
}) {
  return (
    <ul className="max-h-72 space-y-1.5 overflow-y-auto font-mono text-[10px] text-[var(--text)]">
      {entries.map((e, i) => (
        <li
          key={`${e.ts}-${i}`}
          className="flex flex-wrap items-baseline gap-2 rounded-md bg-[var(--surface-2)] px-2 py-1.5"
        >
          <span
            className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ring-1 ${layerBadge[e.layer]}`}
          >
            {e.layer}
          </span>
          <span className="text-[var(--muted)]">{e.kind}</span>
          <span>{e.message}</span>
        </li>
      ))}
      {!entries.length ? (
        <li className="text-[var(--muted)]">Chưa có — tick hoặc bật auto.</li>
      ) : null}
    </ul>
  );
}
