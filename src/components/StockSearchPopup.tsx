"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Stock } from "@/lib/desktop/db";
import { getStocks } from "@/lib/desktop/db";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  addSymbolToWatchlist,
  setSelectedSymbol,
} from "@/stores/demoSlice";

type ExchangeFilter = "ALL" | "HOSE" | "HNX" | "UPCOM";
type TypeFilter = "ALL" | "ST" | "EF" | "FU";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function StockSearchPopup({ open, onClose }: Props) {
  const dispatch = useAppDispatch();
  const savedWatchlists = useAppSelector((s) => s.demo.savedWatchlists);

  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [exchange, setExchange] = useState<ExchangeFilter>("ALL");
  const [stockType, setStockType] = useState<TypeFilter>("ALL");
  const [addingWl, setAddingWl] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setSearch("");
      setDebouncedSearch("");
      setExchange("ALL");
      setStockType("ALL");
      setAddingWl(null);
    }
  }, [open]);

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
      setError("Cần chạy Tauri desktop để tra cứu SQLite");
    } else {
      setError(result.detail || "Lỗi truy vấn");
    }
    setLoading(false);
  }, [exchange, stockType, debouncedSearch]);

  useEffect(() => {
    if (open) void fetchData();
  }, [open, fetchData]);

  const handleSelect = (symbol: string) => {
    dispatch(setSelectedSymbol(symbol));
    onClose();
  };

  const handleAddToWl = (symbol: string, watchlistId: string) => {
    dispatch(addSymbolToWatchlist({ watchlistId, symbol }));
    setAddingWl(null);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[8vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[75vh] w-full max-w-xl flex-col rounded-xl border border-[#1e293b] bg-[#0f1419] shadow-2xl">
        {/* Header + search */}
        <div className="flex flex-col gap-2 border-b border-[#1e293b] px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#f8fafc]">
              Tra cứu mã cổ phiếu
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded px-2 py-1 text-xs text-[#94a3b8] hover:bg-[#1e293b] hover:text-[#f8fafc]"
            >
              Đóng ✕
            </button>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm mã, tên công ty... (VD: VNM, Vinamilk)"
            className="w-full rounded-lg border border-[#1e293b] bg-[#050608] px-3 py-2 text-sm text-[#e2e8f0] placeholder:text-[#64748b] focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
          />
          <div className="flex items-center gap-2">
            <select
              value={exchange}
              onChange={(e) => setExchange(e.target.value as ExchangeFilter)}
              className="rounded border border-[#1e293b] bg-[#050608] px-2 py-1 text-[11px] text-[#e2e8f0] focus:outline-none"
            >
              <option value="ALL">Tất cả sàn</option>
              <option value="HOSE">HOSE</option>
              <option value="HNX">HNX</option>
              <option value="UPCOM">UPCOM</option>
            </select>
            <select
              value={stockType}
              onChange={(e) => setStockType(e.target.value as TypeFilter)}
              className="rounded border border-[#1e293b] bg-[#050608] px-2 py-1 text-[11px] text-[#e2e8f0] focus:outline-none"
            >
              <option value="ALL">Tất cả loại</option>
              <option value="ST">Cổ phiếu</option>
              <option value="EF">Quỹ ETF</option>
              <option value="FU">Phái sinh</option>
            </select>
            <span className="ml-auto text-[10px] text-[#64748b]">
              {loading ? "Đang tải..." : `${stocks.length} kết quả`}
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="border-b border-rose-900/50 bg-rose-950/40 px-4 py-2 text-[11px] text-rose-300">
            {error}
          </div>
        )}

        {/* Stock list */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {stocks.map((stock) => (
            <div
              key={stock.symbol}
              className="group flex items-center gap-3 border-b border-[#1a222c] px-4 py-2 hover:bg-[#1a222c] cursor-pointer"
              onClick={() => handleSelect(stock.symbol)}
            >
              <div className="min-w-[52px]">
                <span className="text-[12px] font-bold text-amber-300">
                  {stock.symbol}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-[11px] text-[#e2e8f0]">
                  {stock.orgShortName || stock.stockName}
                </p>
              </div>
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                  stock.exchangeCode === "HOSE"
                    ? "bg-amber-500/15 text-amber-400"
                    : stock.exchangeCode === "HNX"
                    ? "bg-sky-500/15 text-sky-400"
                    : "bg-emerald-500/15 text-emerald-400"
                }`}
              >
                {stock.exchangeCode}
              </span>
              {/* Add to watchlist */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAddingWl(addingWl === stock.symbol ? null : stock.symbol);
                  }}
                  className="rounded px-1.5 py-0.5 text-[10px] text-[#64748b] opacity-0 ring-1 ring-[#2a3340] hover:text-amber-300 group-hover:opacity-100"
                  title="Thêm vào watchlist"
                >
                  +WL
                </button>
                {addingWl === stock.symbol && savedWatchlists.length > 0 && (
                  <div className="absolute right-0 top-full z-10 mt-1 min-w-[130px] rounded-lg border border-[#1e293b] bg-[#0f1419] py-1 shadow-xl">
                    {savedWatchlists.map((wl) => (
                      <button
                        key={wl.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToWl(stock.symbol, wl.id);
                        }}
                        className="block w-full px-3 py-1.5 text-left text-[11px] text-[#e2e8f0] hover:bg-[#1a222c]"
                      >
                        {wl.name}
                        {wl.symbols.includes(stock.symbol) && (
                          <span className="ml-1 text-emerald-400">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {!stocks.length && !loading && !error && (
            <p className="py-8 text-center text-[11px] text-[#64748b]">
              Không tìm thấy mã nào
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
