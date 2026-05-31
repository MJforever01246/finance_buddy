"use client";

import { useMemo, useState } from "react";
import {
  scanPortfolioIndicators,
  type PortfolioScanResult,
} from "@/lib/chart/portfolioScan";
import { portfolioTotals } from "@/lib/portfolio/metrics";
import { PORTFOLIO_IMPORT_EXAMPLE } from "@/lib/portfolio/parsePortfolio";
import { fmtVi } from "@/lib/vps/formatVi";
import {
  createSavedWatchlist,
  createWatchlistFromPortfolio,
  fetchVpsStockData,
  importPortfolioWithPrices,
  setSelectedSymbol,
} from "@/stores/demoSlice";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { PortfolioImportPopup } from "./PortfolioImportPopup";
import { WatchlistPopup } from "./WatchlistPopup";
function signalBadge(signal: "bullish" | "bearish" | "neutral") {
  if (signal === "bullish")
    return "bg-[var(--up-bg)] text-[var(--up)] ring-emerald-500/25";
  if (signal === "bearish")
    return "bg-[var(--down-bg)] text-[var(--down)] ring-[var(--down)]/30";
  return "bg-amber-500/15 text-amber-700 ring-amber-500/25 dark:text-amber-300";
}

function signalLabel(signal: "bullish" | "bearish" | "neutral") {
  if (signal === "bullish") return "Tích cực";
  if (signal === "bearish") return "Tiêu cực";
  return "Trung lập";
}

export function PortfolioPanel() {
  const dispatch = useAppDispatch();
  const positions = useAppSelector((s) => s.demo.positions);
  const prices = useAppSelector((s) => s.demo.prices);
  const vpsLoading = useAppSelector((s) => s.demo.vpsLoading);

  const [importOpen, setImportOpen] = useState(false);
  const [wlOpen, setWlOpen] = useState(false);  const [newWlName, setNewWlName] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scan, setScan] = useState<PortfolioScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const totals = useMemo(
    () => portfolioTotals(positions, prices),
    [positions, prices],
  );

  const handleScan = async () => {    if (!positions.length) return;
    setScanning(true);
    setScanError(null);
    try {
      const result = await scanPortfolioIndicators({ positions, prices });
      setScan(result);
      if (!result.scanned) {
        setScanError("Không quét được mã nào — thử Tải VPS hoặc chọn mã có OHLCV.");
      }
    } catch (e) {
      setScanError(e instanceof Error ? e.message : String(e));
    } finally {
      setScanning(false);
    }
  };

  const handleCreateWatchlist = () => {
    const name = newWlName.trim();
    if (name) {
      dispatch(createWatchlistFromPortfolio({ name }));
    } else {
      const symbols = [...new Set(positions.map((p) => p.symbol))];
      dispatch(createSavedWatchlist({ name: "Danh mục hiện tại", symbols }));
    }
    setNewWlName("");
  };

  const pnlTone =
    totals.pnlAbs > 0 ? "text-[var(--up)]" : totals.pnlAbs < 0 ? "text-[var(--down)]" : "text-[var(--muted)]";

  return (
    <section className="fb-panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text)]">
            Danh mục đầu tư
          </h2>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">
            Import giá vốn · cập nhật giá · quét chỉ báo RSI/MA theo trọng số danh mục
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() =>
              void dispatch(
                importPortfolioWithPrices({
                  text: PORTFOLIO_IMPORT_EXAMPLE,
                  mode: "replace",
                }),
              )
            }
            className="fb-toolbar-btn text-[11px]"
          >
            Demo 3 mã
          </button>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="fb-toolbar-btn-primary text-[11px]"
          >
            Import nhanh
          </button>          <button
            type="button"
            disabled={vpsLoading || !positions.length}
            onClick={() => void dispatch(fetchVpsStockData())}
            className="fb-toolbar-btn text-[11px] disabled:opacity-50"
          >
            Cập nhật giá
          </button>
          <button
            type="button"
            onClick={() => setWlOpen(true)}
            className="fb-toolbar-btn text-[11px]"
          >
            Watchlist
          </button>
        </div>
      </div>

      <div className="grid gap-3 px-4 py-3 sm:grid-cols-4">        <Stat label="Giá vốn" value={`${fmtVi(totals.invested)} đ`} />
        <Stat label="Giá trị hiện tại" value={`${fmtVi(totals.market)} đ`} />
        <Stat
          label="Lãi / lỗ"
          value={`${totals.pnlAbs >= 0 ? "+" : ""}${fmtVi(totals.pnlAbs)} đ`}
          valueClass={pnlTone}
        />
        <Stat
          label="L/L %"
          value={`${totals.pnlPct >= 0 ? "+" : ""}${totals.pnlPct.toFixed(2)}%`}
          valueClass={pnlTone}
        />
      </div>

      {positions.length > 0 ? (
        <div className="overflow-x-auto border-t border-[var(--border)]">
          <table className="w-full min-w-[640px] text-[11px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-left text-[10px] uppercase tracking-wide text-[var(--muted)]">
                <th className="px-3 py-2 font-medium">Mã</th>
                <th className="px-3 py-2 font-medium text-right">KL</th>
                <th className="px-3 py-2 font-medium text-right">Giá vốn</th>
                <th className="px-3 py-2 font-medium text-right">Giá TT</th>
                <th className="px-3 py-2 font-medium text-right">Giá trị</th>
                <th className="px-3 py-2 font-medium text-right">L/L</th>
                <th className="px-3 py-2 font-medium text-right">%</th>
                <th className="px-3 py-2 font-medium text-right">Tỷ trọng</th>
              </tr>
            </thead>
            <tbody>
              {totals.rows.map((row) => {
                const rowTone =
                  row.pnlAbs > 0
                    ? "text-[var(--up)]"
                    : row.pnlAbs < 0
                      ? "text-[var(--down)]"
                      : "text-[var(--text)]";
                const scanRow = scan?.rows.find((r) => r.symbol === row.symbol);
                return (
                  <tr
                    key={row.symbol}
                    className="border-b border-[var(--border)]/60 hover:bg-[var(--surface-2)]"
                  >
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => dispatch(setSelectedSymbol(row.symbol))}
                        className="font-semibold text-[var(--accent)] hover:underline"
                      >
                        {row.symbol}
                      </button>
                      {scanRow ? (
                        <span
                          className={`ml-2 rounded px-1.5 py-0.5 text-[9px] font-medium ring-1 ${signalBadge(scanRow.signal)}`}
                        >
                          {signalLabel(scanRow.signal)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-right font-data tabular-nums">
                      {row.qty.toLocaleString("vi-VN")}
                    </td>
                    <td className="px-3 py-2 text-right font-data tabular-nums">
                      {fmtVi(row.avgCost)}
                    </td>
                    <td className="px-3 py-2 text-right font-data tabular-nums">
                      {fmtVi(row.price)}
                    </td>
                    <td className="px-3 py-2 text-right font-data tabular-nums">
                      {fmtVi(row.market)}
                    </td>
                    <td className={`px-3 py-2 text-right font-data tabular-nums ${rowTone}`}>
                      {row.pnlAbs >= 0 ? "+" : ""}
                      {fmtVi(row.pnlAbs)}
                    </td>
                    <td className={`px-3 py-2 text-right font-data tabular-nums ${rowTone}`}>
                      {row.pnlPct >= 0 ? "+" : ""}
                      {row.pnlPct.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-right font-data tabular-nums text-[var(--muted)]">
                      {row.weightPct.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-4 py-6 text-center text-sm text-[var(--muted)]">
          Chưa có danh mục — bấm Import hoặc Demo 3 mã.
        </p>
      )}

      <div className="border-t border-[var(--border)] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-semibold text-[var(--text)]">
              Quét chỉ báo danh mục
            </h3>
            <p className="text-[10px] text-[var(--muted)]">
              RSI(14) + MA20/MA50 · trọng số theo giá trị thị trường · demo, không phải khuyến nghị
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <input
              type="text"
              value={newWlName}
              onChange={(e) => setNewWlName(e.target.value)}
              placeholder="Tên watchlist từ PF"
              className="fb-board-input max-w-[160px] text-[11px]"
            />
            <button
              type="button"
              disabled={!positions.length}
              onClick={handleCreateWatchlist}
              className="fb-toolbar-btn text-[11px] disabled:opacity-50"
            >
              → Watchlist
            </button>
            <button
              type="button"
              disabled={scanning || !positions.length}
              onClick={() => void handleScan()}
              className="fb-toolbar-btn-primary text-[11px] disabled:opacity-50"
            >
              {scanning ? "Đang quét…" : "Quét TA"}
            </button>
          </div>
        </div>

        {scanError ? (
          <p className="mt-2 text-[11px] text-rose-600 dark:text-rose-400">{scanError}</p>
        ) : null}

        {scan && scan.scanned > 0 ? (
          <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 ${signalBadge(scan.overall)}`}
              >
                Tổng thể: {signalLabel(scan.overall)}
              </span>
              <span className="text-[11px] text-[var(--muted)]">{scan.summary}</span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <MiniStat label="Tích cực" value={String(scan.bullishCount)} tone="up" />
              <MiniStat label="Trung lập" value={String(scan.neutralCount)} tone="warn" />
              <MiniStat label="Tiêu cực" value={String(scan.bearishCount)} tone="down" />
            </div>
            {scan.failed.length ? (
              <p className="mt-2 text-[10px] text-[var(--muted)]">
                Thiếu dữ liệu: {scan.failed.join(", ")}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <WatchlistPopup open={wlOpen} onClose={() => setWlOpen(false)} />
      <PortfolioImportPopup open={importOpen} onClose={() => setImportOpen(false)} />
    </section>  );
}

function Stat({
  label,
  value,
  valueClass = "text-[var(--text)]",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
        {label}
      </div>
      <div className={`mt-1 font-data text-sm font-semibold tabular-nums ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "up" | "down" | "warn";
}) {
  const cls =
    tone === "up"
      ? "text-[var(--up)]"
      : tone === "down"
        ? "text-[var(--down)]"
        : "text-amber-600 dark:text-amber-300";
  return (
    <div className="rounded-md bg-[var(--surface)] px-2 py-1.5 ring-1 ring-[var(--border)]">
      <div className="text-[10px] text-[var(--muted)]">{label}</div>
      <div className={`font-data text-lg font-bold tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}
