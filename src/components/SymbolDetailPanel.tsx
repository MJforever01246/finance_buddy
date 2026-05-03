"use client";

import { useMemo } from "react";
import { metricsSnapshot } from "@/lib/orchestration/pipeline";
import { useDemoStore } from "@/stores/demo-store";

export function SymbolDetailPanel() {
  const prices = useDemoStore((s) => s.prices);
  const positions = useDemoStore((s) => s.positions);
  const ticks = useDemoStore((s) => s.ticks);
  const insights = useDemoStore((s) => s.insights);
  const selectedSymbol = useDemoStore((s) => s.selectedSymbol);

  const pos = useMemo(
    () => positions.find((p) => p.symbol === selectedSymbol),
    [positions, selectedSymbol],
  );
  const lastTick = useMemo(
    () => ticks.find((t) => t.symbol === selectedSymbol),
    [ticks, selectedSymbol],
  );
  const symInsights = useMemo(
    () =>
      selectedSymbol
        ? insights.filter((i) => i.relatedSymbols.includes(selectedSymbol)).slice(0, 6)
        : [],
    [insights, selectedSymbol],
  );

  const portMetrics = useMemo(
    () => metricsSnapshot(positions, prices),
    [positions, prices],
  );

  if (!selectedSymbol) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-4 text-center text-sm text-[var(--muted)]">
        Chọn một mã ở bảng giá để xem chi tiết.
      </div>
    );
  }

  const px = prices[selectedSymbol] ?? 0;
  const posPnlPct =
    pos && px ? ((px - pos.avgCost) / pos.avgCost) * 100 : null;
  const posPnlAbs =
    pos && px ? (px - pos.avgCost) * pos.qty : null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] pb-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Chi tiết mã
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--text)]">
            {selectedSymbol}
          </p>
        </div>
        <div className="text-right font-mono tabular-nums">
          <div className="text-lg font-semibold">{px.toFixed(2)}</div>
          {lastTick ? (
            <div
              className={`text-sm font-medium ${
                lastTick.changePct >= 0 ? "text-[var(--up)]" : "text-[var(--down)]"
              }`}
            >
              {lastTick.changePct >= 0 ? "+" : ""}
              {lastTick.changePct.toFixed(2)}%
            </div>
          ) : (
            <div className="text-xs text-[var(--muted)]">Chưa có tick gần đây</div>
          )}
        </div>
      </div>

      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between gap-2 rounded-md bg-[var(--surface-2)] px-3 py-2">
          <dt className="text-[var(--muted)]">Vị thế</dt>
          <dd className="font-mono text-xs">
            {pos ? `${pos.qty} cp · GBQ ${pos.avgCost}` : "Không trong danh mục demo"}
          </dd>
        </div>
        {pos && posPnlPct !== null ? (
          <div className="flex justify-between gap-2 rounded-md bg-[var(--surface-2)] px-3 py-2">
            <dt className="text-[var(--muted)]">P/L vị thế (demo)</dt>
            <dd className="text-right font-mono">
              <span
                className={`font-semibold ${
                  posPnlPct >= 0 ? "text-[var(--up)]" : "text-[var(--down)]"
                }`}
              >
                {posPnlPct >= 0 ? "+" : ""}
                {posPnlPct.toFixed(2)}%
              </span>
              {posPnlAbs !== null ? (
                <span className="ml-2 text-xs text-[var(--muted)]">
                  ({posPnlAbs >= 0 ? "+" : ""}
                  {posPnlAbs.toFixed(0)})
                </span>
              ) : null}
            </dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-2 rounded-md bg-[var(--surface-2)] px-3 py-2">
          <dt className="text-[var(--muted)]">Danh mục P/L</dt>
          <dd
            className={`font-mono text-xs font-medium ${
              portMetrics.pnl.pnlPct >= 0 ? "text-[var(--up)]" : "text-[var(--down)]"
            }`}
          >
            {portMetrics.pnl.pnlPct >= 0 ? "+" : ""}
            {portMetrics.pnl.pnlPct.toFixed(2)}%
          </dd>
        </div>
      </dl>

      <div className="min-h-0 flex-1">
        <p className="mb-2 text-xs font-medium text-[var(--muted)]">Insight liên quan</p>
        <ul className="space-y-2 text-xs">
          {symInsights.map((i) => (
            <li
              key={i.id}
              className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-2 leading-snug text-[var(--text)]"
            >
              {i.title}
            </li>
          ))}
          {!symInsights.length ? (
            <li className="text-[var(--muted)]">Chưa có insight cho mã này.</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
