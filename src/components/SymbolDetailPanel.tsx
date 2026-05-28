"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Stock } from "@/lib/desktop/db";
import { getStockBySymbol } from "@/lib/desktop/db";
import { metricsSnapshot } from "@/lib/orchestration/pipeline";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { addSymbolToWatchlist } from "@/stores/demoSlice";

export function SymbolDetailPanel() {
  const dispatch = useAppDispatch();
  const prices = useAppSelector((s) => s.demo.prices);
  const positions = useAppSelector((s) => s.demo.positions);
  const ticks = useAppSelector((s) => s.demo.ticks);
  const insights = useAppSelector((s) => s.demo.insights);
  const selectedSymbol = useAppSelector((s) => s.demo.selectedSymbol);
  const savedWatchlists = useAppSelector((s) => s.demo.savedWatchlists);

  const [stockInfo, setStockInfo] = useState<Stock | null>(null);
  const [showWlMenu, setShowWlMenu] = useState(false);

  const fetchStockInfo = useCallback(async () => {
    if (!selectedSymbol) {
      setStockInfo(null);
      return;
    }
    const result = await getStockBySymbol(selectedSymbol);
    if (result.ok) setStockInfo(result.data);
    else setStockInfo(null);
  }, [selectedSymbol]);

  useEffect(() => {
    void fetchStockInfo();
  }, [fetchStockInfo]);

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

  const inWatchlists = savedWatchlists.filter((wl) =>
    wl.symbols.includes(selectedSymbol),
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] pb-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Chi tiết mã
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--text)]">
            {selectedSymbol}
          </p>
          {stockInfo && (
            <p className="mt-0.5 text-[11px] text-[var(--muted)]">
              {stockInfo.orgShortName || stockInfo.stockName}
              <span className="ml-2 rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[9px] font-semibold">
                {stockInfo.exchangeCode}
              </span>
            </p>
          )}
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
            <div className="text-xs text-[var(--muted)]">Chưa có tick</div>
          )}
        </div>
      </div>

      {/* Stock info from SQLite */}
      {stockInfo && (
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <div>
              <span className="text-[var(--muted)]">Sàn: </span>
              <span className="font-medium text-[var(--text)]">{stockInfo.exchangeCode}</span>
            </div>
            <div>
              <span className="text-[var(--muted)]">Loại: </span>
              <span className="font-medium text-[var(--text)]">
                {stockInfo.stockType === "ST"
                  ? "Cổ phiếu"
                  : stockInfo.stockType === "EF"
                  ? "ETF"
                  : stockInfo.stockType}
              </span>
            </div>
            {stockInfo.enOrgShortName && (
              <div className="col-span-2">
                <span className="text-[var(--muted)]">EN: </span>
                <span className="text-[var(--text)]">{stockInfo.enOrgShortName}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add to watchlist quick action */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowWlMenu(!showWlMenu)}
            className="rounded-md px-2.5 py-1.5 text-[11px] font-medium text-amber-600 ring-1 ring-amber-500/30 hover:bg-amber-500/10 dark:text-amber-300"
          >
            + Watchlist
          </button>
          {inWatchlists.length > 0 && (
            <span className="text-[10px] text-[var(--muted)]">
              Trong: {inWatchlists.map((w) => w.name).join(", ")}
            </span>
          )}
        </div>
        {showWlMenu && savedWatchlists.length > 0 && (
          <div className="absolute left-0 top-full z-20 mt-1 min-w-[160px] rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg">
            {savedWatchlists.map((wl) => {
              const already = wl.symbols.includes(selectedSymbol);
              return (
                <button
                  key={wl.id}
                  type="button"
                  disabled={already}
                  onClick={() => {
                    dispatch(
                      addSymbolToWatchlist({
                        watchlistId: wl.id,
                        symbol: selectedSymbol,
                      }),
                    );
                    setShowWlMenu(false);
                  }}
                  className="block w-full px-3 py-1.5 text-left text-[11px] text-[var(--text)] hover:bg-[var(--surface-2)] disabled:opacity-40"
                >
                  {wl.name}
                  {already && (
                    <span className="ml-1 text-[var(--up)]">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Position info */}
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

      {/* Insights */}
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
