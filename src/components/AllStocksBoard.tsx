"use client";

import { useCallback, useEffect, useState } from "react";
import type { Stock } from "@/lib/desktop/db";
import { getStocks } from "@/lib/desktop/db";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { addSymbolToWatchlist, setSelectedSymbol } from "@/stores/demoSlice";

type ExchangeFilter = "ALL" | "HOSE" | "HNX" | "UPCOM";
type TypeFilter = "ALL" | "ST" | "EF" | "FU";

export function AllStocksBoard() {
  const dispatch = useAppDispatch();
  const selectedSymbol = useAppSelector((s) => s.demo.selectedSymbol);
  const savedWatchlists = useAppSelector((s) => s.demo.savedWatchlists);

  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [exchange, setExchange] = useState<ExchangeFilter>("ALL");
  const [stockType, setStockType] = useState<TypeFilter>("ALL");
  const [addingWl, setAddingWl] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getStocks({
      exchange: exchange === "ALL" ? undefined : exchange,
      stockType: stockType === "ALL" ? undefined : stockType,
      search: debouncedSearch || undefined,
    });
    if (result.ok) {
      setStocks(result.data);
    } else if (result.reason === "not_tauri") {
      setError("Cần chạy Tauri desktop (npm run desktop:dev) để truy cập SQLite.");
    } else {
      setError(result.detail || "Lỗi truy vấn DB");
    }
    setLoading(false);
  }, [exchange, stockType, debouncedSearch]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return (
    <div className="fb-board">
      <div className="fb-board-toolbar">
        <input
          type="search"
          placeholder="Tìm mã, tên công ty..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="fb-board-input sm:max-w-[240px]"
        />
        <div className="flex gap-1">
          {(["ALL", "HOSE", "HNX", "UPCOM"] as ExchangeFilter[]).map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setExchange(ex)}
              className={`fb-board-tab ${exchange === ex ? "fb-board-tab--active" : ""}`}
            >
              {ex === "ALL" ? "Tất cả" : ex}
            </button>
          ))}
        </div>
        <select
          value={stockType}
          onChange={(e) => setStockType(e.target.value as TypeFilter)}
          className="fb-board-select"
        >
          <option value="ALL">Tất cả loại</option>
          <option value="ST">Cổ phiếu</option>
          <option value="EF">Quỹ ETF</option>
          <option value="FU">Phái sinh</option>
        </select>
        <span className="fb-kpi-label ml-auto font-data">
          {loading ? "Đang tải..." : `${stocks.length} mã`}
        </span>
      </div>

      {error && (
        <p className="border-b border-[var(--down)]/30 bg-[var(--down-bg)] px-3 py-2 text-[11px] text-[var(--down)]">
          {error}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[500px] border-collapse text-left">
          <thead className="sticky top-0 z-20 shadow-sm">
            <tr>
              <th className="fb-board-th px-2 py-1.5">Mã</th>
              <th className="fb-board-th px-2 py-1.5">Tên</th>
              <th className="fb-board-th hidden px-2 py-1.5 md:table-cell">
                Sàn
              </th>
              <th className="fb-board-th hidden px-2 py-1.5 lg:table-cell">
                Loại
              </th>
              <th className="fb-board-th px-2 py-1.5 text-right">WL</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock) => {
              const isSelected = stock.symbol === selectedSymbol;
              return (
                <tr
                  key={stock.symbol}
                  onClick={() => dispatch(setSelectedSymbol(stock.symbol))}
                  className={`fb-board-row cursor-pointer border-b border-[var(--border)] transition-colors ${isSelected ? "fb-board-row--selected" : ""}`}
                >
                  <td className="fb-board-td px-2 py-1 text-[11px] font-bold text-[var(--accent)]">
                    {stock.symbol}
                  </td>
                  <td className="max-w-[240px] truncate border border-[var(--border)] px-2 py-1 text-[11px]">
                    {stock.orgShortName || stock.stockName}
                  </td>
                  <td className="fb-board-td hidden md:table-cell">
                    <span
                      className={`rounded px-1 py-0.5 text-[9px] font-semibold ${
                        stock.exchangeCode === "HOSE"
                          ? "bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)]"
                          : stock.exchangeCode === "HNX"
                            ? "bg-[color-mix(in_srgb,var(--up)_12%,transparent)] text-[var(--up)]"
                            : "bg-[var(--surface)] text-[var(--muted)]"
                      }`}
                    >
                      {stock.exchangeCode}
                    </span>
                  </td>
                  <td className="fb-board-td hidden text-[10px] text-[var(--muted)] lg:table-cell">
                    {stock.stockType === "ST"
                      ? "Cổ phiếu"
                      : stock.stockType === "EF"
                        ? "ETF"
                        : stock.stockType}
                  </td>
                  <td className="relative border border-[var(--border)] px-2 py-1 text-right">
                    {savedWatchlists.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAddingWl(
                            addingWl === stock.symbol ? null : stock.symbol,
                          );
                        }}
                        className="fb-toolbar-btn px-1.5 py-0.5 text-[9px]"
                      >
                        +
                      </button>
                    )}
                    {addingWl === stock.symbol && (
                      <div className="fb-panel absolute right-2 top-full z-30 mt-0.5 min-w-[120px] py-0.5 shadow-xl">
                        {savedWatchlists.map((wl) => (
                          <button
                            key={wl.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              dispatch(
                                addSymbolToWatchlist({
                                  watchlistId: wl.id,
                                  symbol: stock.symbol,
                                }),
                              );
                              setAddingWl(null);
                            }}
                            className="block w-full px-2.5 py-1 text-left text-[10px] hover:bg-[var(--surface-2)]"
                          >
                            {wl.name}
                            {wl.symbols.includes(stock.symbol) && (
                              <span className="fb-tone-up ml-1">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!stocks.length && !loading && !error && (
          <p className="p-6 text-center text-[12px] text-[var(--muted)]">
            Không tìm thấy mã nào
          </p>
        )}
      </div>
    </div>
  );
}
