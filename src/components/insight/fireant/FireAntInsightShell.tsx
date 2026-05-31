"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import {
  addNewsDemo,
  dismissToast,
  importPortfolioDemo,
  loadVpsFullBoard,
  pushManualTick,
  setActiveBookId,
  toggleAutoTicker,
} from "@/stores/demoSlice";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { LiveFeedBridge } from "@/components/LiveFeedBridge";
import { isTauriRuntime } from "@/lib/tauri-env";
import { DEMO_BOOKS } from "@/lib/insight/demoBooks";
import { filterInsightsForBook, summarizeBook } from "@/lib/insight/bookMetrics";
import { FireAntTopNav } from "./FireAntTopNav";
import { FireAntIndexStrip } from "./FireAntIndexStrip";
import { FireAntMainGrid, type MainView } from "./FireAntMainGrid";
import { FireAntBookPanel } from "./FireAntBookPanel";
import { FireAntRightRail, type RailId } from "./FireAntRightRail";
import "./fireant.css";

function AutoTickerBridge() {
  const on = useAppSelector((s) => s.demo.autoTickerOn);
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!on) return;
    const id = window.setInterval(() => void dispatch(pushManualTick()), 1600);
    return () => window.clearInterval(id);
  }, [on, dispatch]);
  return null;
}

export function FireAntInsightShell() {
  const dispatch = useAppDispatch();
  const { setTheme } = useTheme();
  const [mainView, setMainView] = useState<MainView>("books");
  const [rail, setRail] = useState<RailId>("books");

  const reduxPositions = useAppSelector((s) => s.demo.positions);
  const basePrices = useAppSelector((s) => s.demo.prices);
  const allInsights = useAppSelector((s) => s.demo.insights);
  const activeBookId = useAppSelector((s) => s.demo.activeBookId);
  const riskPeakByBook = useAppSelector((s) => s.demo.riskPeakByBook);
  const toast = useAppSelector((s) => s.demo.toast);
  const toastKind = useAppSelector((s) => s.demo.toastKind);
  const autoTickerOn = useAppSelector((s) => s.demo.autoTickerOn);
  const vpsLoading = useAppSelector((s) => s.demo.vpsLoading);

  const activeBook = DEMO_BOOKS.find((b) => b.id === activeBookId) ?? DEMO_BOOKS[0]!;
  const bookInsights = useMemo(
    () => filterInsightsForBook(allInsights, activeBookId),
    [allInsights, activeBookId],
  );
  const summary = useMemo(
    () =>
      summarizeBook(
        activeBook,
        reduxPositions,
        basePrices,
        riskPeakByBook[activeBookId],
      ),
    [activeBook, reduxPositions, basePrices, activeBookId, riskPeakByBook],
  );

  useEffect(() => {
    setTheme("dark");
  }, [setTheme]);

  useEffect(() => {
    if (rail === "insight") setMainView("insight");
    if (rail === "books") setMainView("books");
    if (rail === "scenario") {
      dispatch(setActiveBookId("scenario-hpg"));
      setMainView("holdings");
    }
  }, [rail, dispatch]);

  const selectBook = (id: string) => {
    dispatch(setActiveBookId(id));
    setMainView("holdings");
  };

  return (
    <div className="fireant-shell dark flex h-screen flex-col overflow-hidden">
      <AutoTickerBridge />
      <LiveFeedBridge />
      <FireAntTopNav />
      <FireAntIndexStrip />

      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <FireAntMainGrid
            view={mainView}
            onViewChange={setMainView}
            activeBookId={activeBookId}
            reduxPositions={reduxPositions}
            basePrices={basePrices}
            insights={bookInsights}
            onSelectBook={selectBook}
          />

          <footer
            className="flex shrink-0 flex-wrap items-center gap-2 border-t px-2 py-1"
            style={{ borderColor: "var(--fa-border)", background: "var(--fa-surface-2)" }}
          >
            <button
              type="button"
              onClick={() => void dispatch(pushManualTick())}
              className="rounded bg-[var(--fa-accent)] px-2 py-0.5 text-[10px] font-medium text-white"
            >
              Tick
            </button>
            <button
              type="button"
              onClick={() => dispatch(toggleAutoTicker())}
              className="rounded px-2 py-0.5 text-[10px] ring-1 ring-[var(--fa-border)]"
            >
              {autoTickerOn ? "Stop" : "Live"}
            </button>
            <button
              type="button"
              onClick={() => dispatch(importPortfolioDemo())}
              className="rounded px-2 py-0.5 text-[10px] ring-1 ring-[var(--fa-border)]"
            >
              PF
            </button>
            <button
              type="button"
              onClick={() => dispatch(addNewsDemo())}
              className="rounded px-2 py-0.5 text-[10px] ring-1 ring-[var(--fa-border)]"
            >
              Tin
            </button>
            {isTauriRuntime() ? (
              <button
                type="button"
                disabled={vpsLoading}
                onClick={() => void dispatch(loadVpsFullBoard())}
                className="rounded px-2 py-0.5 text-[10px] ring-1 ring-[var(--fa-border)] disabled:opacity-50"
              >
                {vpsLoading ? "VPS…" : "Bảng VPS"}
              </button>
            ) : null}
            <span className="ml-auto text-[10px] text-[var(--fa-muted)]">
              Pipeline insight · sổ «{activeBook.label}»
            </span>
          </footer>
        </div>

        <FireAntBookPanel
          book={activeBook}
          market={summary.market}
          pnlPct={summary.pnlPct}
          risk={summary.risk}
          maxSymbol={summary.maxSymbol}
          maxPct={summary.maxPct}
          weights={summary.weights}
          insights={bookInsights}
          scenarioNote={activeBook.scenarioNote}
          positions={summary.positions}
          prices={summary.prices}
          peakEquity={summary.peakEquity}
        />

        <FireAntRightRail active={rail} onSelect={setRail} />
      </div>

      {toast ? (
        <div
          className="fixed bottom-3 left-3 z-50 max-w-xs rounded border p-2 shadow-lg"
          style={{ borderColor: "var(--fa-border)", background: "var(--fa-surface)" }}
          role="alert"
        >
          <p className="text-[10px] font-semibold text-[var(--fa-accent)]">
            {toastKind === "risk" ? "Cảnh báo rủi ro" : "Smart alert"}
          </p>
          <p className="mt-0.5 text-[11px]">{toast}</p>
          <button
            type="button"
            onClick={() => dispatch(dismissToast())}
            className="mt-1 text-[10px] text-[var(--fa-muted)]"
          >
            Đóng
          </button>
        </div>
      ) : null}
    </div>
  );
}
