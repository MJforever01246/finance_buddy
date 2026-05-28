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
    <div className="flex h-full min-h-0 min-w-0 flex-col rounded-lg border border-[#1e293b] bg-[#050608] text-[10px] text-[#e2e8f0] shadow-lg">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#1e293b] bg-[#0a0e12] px-2 py-2">
        <input
          type="search"
          placeholder="Tìm mã, tên công ty..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[160px] flex-1 rounded border border-[#1e293b] bg-[#0f1419] px-2 py-1.5 text-[11px] text-[#e2e8f0] placeholder:text-[#64748b] focus:outline-none focus:ring-1 focus:ring-amber-500/50 sm:max-w-[240px]"
        />
        <div className="flex gap-1">
          {(["ALL", "HOSE", "HNX", "UPCOM"] as ExchangeFilter[]).map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setExchange(ex)}
              className={`rounded px-2 py-1 text-[10px] font-semibold ${
                exchange === ex
                  ? "bg-amber-500/25 text-amber-300 ring-1 ring-amber-500/40"
                  : "text-[#94a3b8] hover:bg-[#1e293b]"
              }`}
            >
              {ex === "ALL" ? "Tất cả" : ex}
            </button>
          ))}
        </div>
        <select
          value={stockType}
          onChange={(e) => setStockType(e.target.value as TypeFilter)}
          className="rounded border border-[#1e293b] bg-[#0f1419] px-2 py-1.5 text-[11px] text-[#e2e8f0] focus:outline-none"
        >
          <option value="ALL">Tất cả loại</option>
          <option value="ST">Cổ phiếu</option>
          <option value="EF">Quỹ ETF</option>
          <option value="FU">Phái sinh</option>
        </select>
        <span className="ml-auto text-[10px] text-[#64748b]">
          {loading ? "Đang tải..." : `${stocks.length} mã`}
        </span>
      </div>

      {/* Error */}
      {error && (
        <p className="border-b border-rose-900/50 bg-rose-950/40 px-3 py-2 text-[11px] text-rose-300">
          {error}
        </p>
      )}

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[500px] border-collapse text-left">
          <thead className="sticky top-0 z-20 bg-[#0f1419] shadow-sm">
            <tr>
              <th className="border border-[#1e293b] px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                Mã
              </th>
              <th className="border border-[#1e293b] px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                Tên
              </th>
              <th className="hidden border border-[#1e293b] px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-[#94a3b8] md:table-cell">
                Sàn
              </th>
              <th className="hidden border border-[#1e293b] px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-[#94a3b8] lg:table-cell">
                Loại
              </th>
              <th className="border border-[#1e293b] px-2 py-1.5 text-right text-[9px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                WL
              </th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock) => {
              const isSelected = stock.symbol === selectedSymbol;
              return (
                <tr
                  key={stock.symbol}
                  onClick={() => dispatch(setSelectedSymbol(stock.symbol))}
                  className={`cursor-pointer border-b border-[#1a222c] transition-colors hover:bg-[#0f1419] ${
                    isSelected ? "bg-blue-950/40" : ""
                  }`}
                >
                  <td className="border border-[#1e293b] px-2 py-1 text-[11px] font-bold text-amber-300">
                    {stock.symbol}
                  </td>
                  <td className="max-w-[240px] truncate border border-[#1e293b] px-2 py-1 text-[11px] text-[#e2e8f0]">
                    {stock.orgShortName || stock.stockName}
                  </td>
                  <td className="hidden border border-[#1e293b] px-2 py-1 md:table-cell">
                    <span
                      className={`rounded px-1 py-0.5 text-[9px] font-semibold ${
                        stock.exchangeCode === "HOSE"
                          ? "bg-amber-500/15 text-amber-400"
                          : stock.exchangeCode === "HNX"
                          ? "bg-sky-500/15 text-sky-400"
                          : "bg-emerald-500/15 text-emerald-400"
                      }`}
                    >
                      {stock.exchangeCode}
                    </span>
                  </td>
                  <td className="hidden border border-[#1e293b] px-2 py-1 text-[10px] text-[#64748b] lg:table-cell">
                    {stock.stockType === "ST"
                      ? "Cổ phiếu"
                      : stock.stockType === "EF"
                      ? "ETF"
                      : stock.stockType}
                  </td>
                  <td className="relative border border-[#1e293b] px-2 py-1 text-right">
                    {savedWatchlists.length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAddingWl(
                            addingWl === stock.symbol ? null : stock.symbol,
                          );
                        }}
                        className="rounded px-1.5 py-0.5 text-[9px] text-[#64748b] ring-1 ring-[#2a3340] hover:text-amber-300 hover:ring-amber-500/40"
                      >
                        +
                      </button>
                    )}
                    {addingWl === stock.symbol && (
                      <div className="absolute right-2 top-full z-30 mt-0.5 min-w-[120px] rounded border border-[#1e293b] bg-[#0f1419] py-0.5 shadow-xl">
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
                            className="block w-full px-2.5 py-1 text-left text-[10px] text-[#e2e8f0] hover:bg-[#1a222c]"
                          >
                            {wl.name}
                            {wl.symbols.includes(stock.symbol) && (
                              <span className="ml-1 text-emerald-400">✓</span>
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
          <p className="p-6 text-center text-[12px] text-[#64748b]">
            Không tìm thấy mã nào
          </p>
        )}
      </div>
    </div>
  );
}
