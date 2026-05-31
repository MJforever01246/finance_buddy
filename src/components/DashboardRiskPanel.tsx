"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { summarizeBook } from "@/lib/insight/bookMetrics";
import { findDemoBook } from "@/lib/insight/demoBooks";
import {
  buildPortfolioRiskReport,
  fetchReturnsForPositions,
  type PortfolioRiskReport,
} from "@/lib/risk";
import { fmtVi } from "@/lib/vps/formatVi";
import { setToast } from "@/stores/demoSlice";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";

function statusUi(status: PortfolioRiskReport["status"]) {
  if (status === "halt")
    return {
      label: "HALT",
      cls: "bg-[var(--down-bg)] text-[var(--down)] ring-[var(--down)]/30",
    };
  if (status === "warn")
    return {
      label: "WARN",
      cls: "bg-amber-500/15 text-amber-700 ring-amber-500/30 dark:text-amber-300",
    };
  return {
    label: "OK",
    cls: "bg-[var(--up-bg)] text-[var(--up)] ring-emerald-500/25",
  };
}

/** Panel rủi ro danh mục chính + toast khi WARN/HALT (dashboard `/`). */
export function DashboardRiskPanel() {
  const dispatch = useAppDispatch();
  const positions = useAppSelector((s) => s.demo.positions);
  const prices = useAppSelector((s) => s.demo.prices);
  const riskPeakByBook = useAppSelector((s) => s.demo.riskPeakByBook);

  const ownBook = findDemoBook("own");
  const summary = useMemo(
    () =>
      summarizeBook(
        ownBook,
        positions,
        prices,
        riskPeakByBook.own,
      ),
    [ownBook, positions, prices, riskPeakByBook.own],
  );

  const [returnsBySymbol, setReturnsBySymbol] = useState<
    Record<string, number[]>
  >({});
  const symKey = positions.map((p) => p.symbol).join(",");

  useEffect(() => {
    if (!positions.length) {
      setReturnsBySymbol({});
      return;
    }
    let cancelled = false;
    void fetchReturnsForPositions(positions).then((r) => {
      if (!cancelled) setReturnsBySymbol(r);
    });
    return () => {
      cancelled = true;
    };
  }, [symKey, positions]);

  const report = useMemo(
    () =>
      buildPortfolioRiskReport({
        positions: summary.positions,
        prices: summary.prices,
        peakEquity: summary.peakEquity,
        returnsBySymbol,
      }),
    [summary, returnsBySymbol],
  );

  const lastToastKey = useRef<string | null>(null);

  useEffect(() => {
    if (report.status === "ok" || !report.alerts.length) return;
    const key = `${report.status}:${report.alerts.map((a) => a.code).join(",")}`;
    if (key === lastToastKey.current) return;
    lastToastKey.current = key;

    const top =
      report.alerts.find((a) => a.severity === "risk") ?? report.alerts[0];
    if (!top) return;

    dispatch(
      setToast({
        kind: "risk",
        message: `${top.title}\n${top.detail}`,
      }),
    );
  }, [report, dispatch]);

  const st = statusUi(report.status);

  if (!positions.length) {
    return (
      <div className="fb-panel px-4 py-3 text-xs text-[var(--muted)]">
        Chưa có danh mục — Import PF để xem rủi ro.
      </div>
    );
  }

  return (
    <section className="fb-panel px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-[var(--text)]">
              Quản lý rủi ro
            </h2>
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ${st.cls}`}
            >
              {st.label}
            </span>
            <span className="font-data text-[10px] text-[var(--muted)]">
              Danh mục của tôi
            </span>
          </div>
          <p className="mt-1 text-[10px] text-[var(--muted)]">
            Drawdown · VaR · tập trung — tham chiếu rust-finance
          </p>
        </div>
        <Link
          href="/insight"
          className="fb-toolbar-btn text-[10px] text-[var(--accent)]"
        >
          Chi tiết →
        </Link>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Risk score" value={String(report.riskScore)} />
        <Kpi label="P/L %" value={`${report.pnlPct >= 0 ? "+" : ""}${report.pnlPct.toFixed(2)}%`} />
        <Kpi label="Drawdown" value={`${report.drawdownPct.toFixed(2)}%`} />
        <Kpi
          label="VaR 95%"
          value={
            report.var95_1dPct != null
              ? `${report.var95_1dPct.toFixed(2)}%`
              : "—"
          }
        />
        <Kpi label="Tập trung" value={`${summary.maxSymbol} ${summary.maxPct.toFixed(0)}%`} />
      </div>

      {report.alerts.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {report.alerts.slice(0, 3).map((a) => (
            <li
              key={a.code}
              className={`rounded-md border px-2.5 py-1.5 text-[11px] ${
                a.severity === "risk"
                  ? "border-[var(--down)]/35 bg-[var(--down-bg)] text-[var(--down)]"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200"
              }`}
            >
              <span className="font-medium">{a.title}</span>
              <span className="text-[10px] opacity-90"> — {a.detail}</span>
            </li>
          ))}
        </ul>
      )}

      {report.rebalanceHints.length > 0 && (
        <p className="mt-2 text-[10px] text-[var(--muted)]">
          Rebalance:{" "}
          {report.rebalanceHints
            .slice(0, 2)
            .map(
              (h) =>
                `${h.symbol} cắt ~${fmtVi(h.trimValue / 1e6, 2)}M`,
            )
            .join(" · ")}
        </p>
      )}
    </section>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[var(--surface-2)] px-2.5 py-2">
      <p className="text-[9px] font-medium uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <p className="font-data mt-0.5 text-sm font-semibold text-[var(--text)]">
        {value}
      </p>
    </div>
  );
}
