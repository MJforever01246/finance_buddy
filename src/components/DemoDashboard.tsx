"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addNewsDemo,
  clearLog,
  dismissToast,
  fetchVpsStockData,
  importPortfolioDemo,
  loadIndayBoard,
  loadVpsFullBoard,
  pushManualTick,
  toggleAutoTicker,
} from "@/stores/demoSlice";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { AllStocksBoard } from "./AllStocksBoard";
import { DesktopPing } from "./DesktopPing";
import { LiveFeedBridge } from "./LiveFeedBridge";
import { MobileBridgePanel } from "./MobileBridgePanel";
import { VpsPriceBoard } from "./VpsPriceBoard";
import { NewsClipPanel } from "./NewsClipPanel";
import { SymbolDetailPanel } from "./SymbolDetailPanel";
import { ChartSection } from "./ChartSection";
import { DashboardRiskPanel } from "./DashboardRiskPanel";

const layerBadge: Record<string, string> = {
  data: "bg-emerald-500/15 text-emerald-800 ring-emerald-500/25 dark:text-emerald-300 dark:ring-emerald-500/30",
  intelligence:
    "bg-amber-500/15 text-amber-900 ring-amber-500/25 dark:text-amber-200 dark:ring-amber-500/30",
  communication:
    "bg-sky-500/15 text-sky-900 ring-sky-500/25 dark:text-sky-200 dark:ring-sky-500/30",
};

function AutoTickerBridge() {
  const on = useAppSelector((s) => s.demo.autoTickerOn);
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!on) return;
    const id = window.setInterval(() => {
      void dispatch(pushManualTick());
    }, 1400);
    return () => window.clearInterval(id);
  }, [on, dispatch]);
  return null;
}

export function DemoDashboard() {
  const dispatch = useAppDispatch();
  const pipelineLog = useAppSelector((s) => s.demo.pipelineLog);
  const liveFeedConnected = useAppSelector((s) => s.demo.liveFeedConnected);
  const autoTickerOn = useAppSelector((s) => s.demo.autoTickerOn);
  const toast = useAppSelector((s) => s.demo.toast);
  const toastKind = useAppSelector((s) => s.demo.toastKind);
  const vpsLoading = useAppSelector((s) => s.demo.vpsLoading);
  const vpsError = useAppSelector((s) => s.demo.vpsError);

  const pipelineCount = useMemo(() => pipelineLog.length, [pipelineLog]);

  return (
    <div className="flex min-h-screen flex-col">
      <AutoTickerBridge />
      <LiveFeedBridge />

      <div className="mx-auto flex w-full max-w-[1680px] flex-1 flex-col gap-4 px-3 py-4 sm:px-4">
        <header className="fb-panel mx-auto mb-1 flex w-full max-w-[1680px] flex-col gap-3 px-4 py-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-[var(--text)] sm:text-xl">
              Trung tâm điều hành
            </h1>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-[var(--muted)]">
              Bảng giá, danh mục, insight và pipeline Data → Intelligence → Communication.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`rounded-md px-2 py-1 text-[10px] font-medium font-data ${
                  liveFeedConnected
                    ? "bg-[var(--up-bg)] text-[var(--up)] ring-1 ring-emerald-500/30"
                    : "bg-[var(--surface-2)] text-[var(--muted)] ring-1 ring-[var(--border)]"
                }`}
                title="WebSocket demo-server"
              >
                WS {liveFeedConnected ? ":3456" : "off"}
              </span>
              <button
                type="button"
                onClick={() => void dispatch(pushManualTick())}
                className="fb-toolbar-btn-primary"
              >
                Tick
              </button>
              <button
                type="button"
                onClick={() => dispatch(toggleAutoTicker())}
                className={`fb-toolbar-btn ${autoTickerOn ? "bg-[var(--up-bg)] text-[var(--up)]" : ""}`}
              >
                {autoTickerOn ? "Dừng auto" : "Auto"}
              </button>
              <button type="button" onClick={() => dispatch(importPortfolioDemo())} className="fb-toolbar-btn">
                Import PF
              </button>
              <button type="button" onClick={() => dispatch(addNewsDemo())} className="fb-toolbar-btn">
                Tin demo
              </button>
              <button
                type="button"
                disabled={vpsLoading}
                onClick={() => void dispatch(loadVpsFullBoard())}
                className="fb-toolbar-btn-primary disabled:opacity-50"
              >
                {vpsLoading ? "VPS…" : "Tải VPS"}
              </button>
              <button
                type="button"
                disabled={vpsLoading}
                onClick={() => void dispatch(loadIndayBoard("hose"))}
                className="fb-toolbar-btn disabled:opacity-50"
                title="Snapshot HOSE offline (test_data_inday)"
              >
                HOSE offline
              </button>
              <button
                type="button"
                disabled={vpsLoading}
                onClick={() => void dispatch(loadIndayBoard("vn30"))}
                className="fb-toolbar-btn disabled:opacity-50"
                title="Snapshot VN30 offline"
              >
                VN30 offline
              </button>
              <button
                type="button"
                disabled={vpsLoading}
                onClick={() => void dispatch(fetchVpsStockData())}
                className="fb-toolbar-btn disabled:opacity-50"
              >
                Giá PF
              </button>
              <button type="button" onClick={() => dispatch(clearLog())} className="fb-toolbar-btn text-[var(--muted)]">
                Xóa log
              </button>
            </div>
            {vpsError ? (
              <p className="max-w-md text-right text-[11px] text-rose-600 dark:text-rose-400">{vpsError}</p>
            ) : null}
          </div>
        </header>

        <DesktopPing />

        <DashboardRiskPanel />

        <BoardSection />

        <ChartSection />

        <NewsClipPanel />

        <MobileBridgePanel />

        <details className="rounded-xl border border-[var(--border)] bg-[var(--surface)] open:shadow-sm">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-[var(--text)]">
            Kiến trúc layer & pipeline log
            <span className="ml-2 text-xs font-normal text-[var(--muted)]">
              ({pipelineCount} sự kiện)
            </span>
          </summary>
          <div className="border-t border-[var(--border)] px-4 pb-4 pt-2">
            <pre className="mb-4 overflow-x-auto rounded-lg bg-[var(--surface-2)] p-3 text-[10px] leading-relaxed text-[var(--muted)]">
              {`[Next.js + Redux] ← Tauri desktop:dev / trình duyệt
     ↕ invoke (vps_get_stock_data …)
[src-tauri / reqwest]
     ↕
[Node WS demo] → processWsPayload → Intelligence → Communication`}
            </pre>
            <PipelineLogList entries={pipelineLog} />
          </div>
        </details>
      </div>

      {toast ? (
        <div
          className={`fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border p-4 shadow-lg ring-1 ${
            toastKind === "risk"
              ? "border-[var(--down)]/40 bg-[var(--surface)] ring-[var(--down)]/20"
              : "border-[var(--border)] bg-[var(--surface)] ring-black/5 dark:ring-white/10"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
                className={`text-[10px] font-semibold uppercase tracking-wide ${
                  toastKind === "risk"
                    ? "text-[var(--down)]"
                    : toastKind === "insight"
                      ? "text-[var(--accent)]"
                      : "text-[var(--muted)]"
                }`}
              >
                {toastKind === "risk"
                  ? "Cảnh báo rủi ro"
                  : toastKind === "insight"
                    ? "Smart alert"
                    : "Thông báo"}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text)]">{toast}</p>
            </div>
            <button
              type="button"
              onClick={() => dispatch(dismissToast())}
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

type BoardTab = "all_stocks" | "vps_board";

function BoardSection() {
  const [tab, setTab] = useState<BoardTab>("all_stocks");

  return (
    <div className="h-[min(65vh,640px)]">
      {/* Board tabs */}
      <div className="mb-2 flex items-center gap-1 border-b border-[var(--border)]">
        <button
          type="button"
          onClick={() => setTab("all_stocks")}
          className={`rounded-t-md px-4 py-2 text-xs font-semibold transition-colors ${
            tab === "all_stocks"
              ? "border-b-2 border-[var(--accent)] bg-[var(--surface)] text-[var(--accent)]"
              : "text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          Tất cả mã (SQLite)
        </button>
        <button
          type="button"
          onClick={() => setTab("vps_board")}
          className={`rounded-t-md px-4 py-2 text-xs font-semibold transition-colors ${
            tab === "vps_board"
              ? "border-b-2 border-[var(--accent)] bg-[var(--surface)] text-[var(--accent)]"
              : "text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          Bảng giá VPS
        </button>
      </div>

      <div className="grid h-[calc(100%-40px)] w-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.42fr)_minmax(300px,400px)] xl:items-stretch">
        <div className="min-h-0 min-w-0 overflow-hidden">
          {tab === "all_stocks" ? <AllStocksBoard /> : <VpsPriceBoard />}
        </div>
        <div className="min-h-0 min-w-0 overflow-hidden xl:max-w-[420px] xl:justify-self-end xl:w-full">
          <SymbolDetailPanel />
        </div>
      </div>
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
