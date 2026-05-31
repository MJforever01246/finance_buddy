"use client";

import { useEffect, useMemo, useState } from "react";
import type { Position } from "@/lib/layers/types";
import { fmtVi } from "@/lib/vps/formatVi";
import {
  buildPortfolioRiskReport,
  fetchReturnsForPositions,
  type PortfolioRiskReport,
} from "@/lib/risk";

function statusLabel(status: PortfolioRiskReport["status"]) {
  if (status === "halt") return { text: "HALT", cls: "text-down" };
  if (status === "warn") return { text: "WARN", cls: "text-amber-400" };
  return { text: "OK", cls: "text-up" };
}

export function PortfolioRiskPanel({
  positions,
  prices,
  peakEquity,
  maxSymbol,
  maxPct,
  weights,
}: {
  positions: Position[];
  prices: Record<string, number>;
  peakEquity: number;
  maxSymbol: string;
  maxPct: number;
  weights: { symbol: string; pct: number }[];
}) {
  const [returnsBySymbol, setReturnsBySymbol] = useState<
    Record<string, number[]>
  >({});
  const [loadingVar, setLoadingVar] = useState(false);

  const symKey = positions.map((p) => p.symbol).join(",");

  useEffect(() => {
    if (!positions.length) {
      setReturnsBySymbol({});
      return;
    }
    let cancelled = false;
    setLoadingVar(true);
    void fetchReturnsForPositions(positions).then((r) => {
      if (!cancelled) {
        setReturnsBySymbol(r);
        setLoadingVar(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [symKey, positions]);

  const report = useMemo(
    () =>
      buildPortfolioRiskReport({
        positions,
        prices,
        peakEquity,
        returnsBySymbol,
      }),
    [positions, prices, peakEquity, returnsBySymbol],
  );

  const st = statusLabel(report.status);

  return (
    <div className="space-y-3 text-[11px]">
      <div className="flex items-center justify-between rounded px-2 py-1.5" style={{ background: "var(--fa-surface-2)" }}>
        <span className="text-[var(--fa-muted)]">Trạng thái rủi ro</span>
        <span className={`font-semibold uppercase ${st.cls}`}>{st.text}</span>
      </div>

      <dl className="space-y-1">
        <MetricRow k="Risk score" v={String(report.riskScore)} />
        <MetricRow k="Drawdown (đỉnh NAV)" v={`${report.drawdownPct.toFixed(2)}%`} />
        <MetricRow
          k="VaR 95% (1 ngày)"
          v={
            report.var95_1d != null
              ? `${fmtVi(report.var95_1d / 1e6, 2)}M (${report.var95_1dPct?.toFixed(2)}%)`
              : loadingVar
                ? "Đang tính…"
                : "—"
          }
        />
        <MetricRow
          k="CVaR 95%"
          v={
            report.cvar95 != null
              ? `${fmtVi(report.cvar95 / 1e6, 2)}M`
              : "—"
          }
        />
        <MetricRow
          k="TB |tương quan|"
          v={
            report.avgCorrelation != null
              ? `${(report.avgCorrelation * 100).toFixed(0)}%`
              : "—"
          }
        />
        {report.varSource !== "none" ? (
          <MetricRow k="Nguồn VaR" v={report.varSource === "historical" ? "Lịch sử" : "Tham số"} />
        ) : null}
      </dl>

      {report.alerts.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase text-[var(--fa-muted)]">
            Cảnh báo
          </p>
          <ul className="space-y-1">
            {report.alerts.map((a) => (
              <li
                key={a.code}
                className={`rounded border px-2 py-1 text-[10px] ${
                  a.severity === "risk"
                    ? "border-rose-500/40 bg-rose-950/30"
                    : "border-amber-500/30 bg-amber-950/20"
                }`}
              >
                {a.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.rebalanceHints.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase text-[var(--fa-muted)]">
            Gợi ý rebalance
          </p>
          <ul className="space-y-1 text-[10px]">
            {report.rebalanceHints.map((h) => (
              <li key={h.symbol} className="rounded px-2 py-1" style={{ background: "var(--fa-surface-2)" }}>
                <span className="font-medium">{h.symbol}</span>{" "}
                {h.currentPct.toFixed(0)}% → {h.targetPct}% · cắt ~
                {fmtVi(h.trimValue / 1e6, 2)}M
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="mb-1 text-[10px] font-medium uppercase text-[var(--fa-muted)]">
          Phân bổ trọng số
        </p>
        {weights.map((w) => (
          <div key={w.symbol} className="mb-1.5">
            <div className="flex justify-between">
              <span>{w.symbol}</span>
              <span className="font-data tabular-nums">{w.pct.toFixed(1)}%</span>
            </div>
            <div className="mt-0.5 h-1 rounded-full bg-black/30">
              <div
                className={`h-full rounded-full ${
                  w.symbol === maxSymbol && maxPct >= 35
                    ? "bg-rose-500"
                    : "bg-[var(--fa-accent)]"
                }`}
                style={{ width: `${Math.min(w.pct, 100)}%` }}
              />
            </div>
            {report.componentVar[w.symbol] != null && report.componentVar[w.symbol]! > 0 ? (
              <p className="mt-0.5 text-[9px] text-[var(--fa-muted)]">
                VaR phần: {fmtVi(report.componentVar[w.symbol]! / 1e6, 2)}M
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <p className="text-[9px] leading-relaxed text-[var(--fa-muted)]">
        Mô hình tham chiếu rust-finance: drawdown, VaR 95/99, CVaR, tương quan, giới hạn tập trung.
      </p>
    </div>
  );
}

function MetricRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2 rounded px-2 py-0.5" style={{ background: "var(--fa-surface-2)" }}>
      <dt className="text-[var(--fa-muted)]">{k}</dt>
      <dd className="font-data font-medium tabular-nums">{v}</dd>
    </div>
  );
}
