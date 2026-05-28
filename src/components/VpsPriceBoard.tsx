"use client";

import type { ReactElement, ReactNode } from "react";
import { useMemo, useState } from "react";
import { fmtVi, fmtVolVi } from "@/lib/vps/formatVi";
import type { VpsBoardRow } from "@/lib/vps/types";
import { VN30_SYMBOLS } from "@/lib/vps/vn30";
import type { BoardMarketTab } from "@/stores/demoSlice";
import {
  loadVpsFullBoard,
  setBoardIndustryFilter,
  setBoardMarketTab,
  setBoardSearch,
  setBoardWatchlistId,
  setSelectedSymbol,
} from "@/stores/demoSlice";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { StockSearchPopup } from "./StockSearchPopup";
import { WatchlistPopup } from "./WatchlistPopup";

const MARKET_TABS: { id: BoardMarketTab; label: string }[] = [
  { id: "ALL", label: "Tất cả" },
  { id: "HOSE", label: "HOSE" },
  { id: "VN30", label: "VN30" },
  { id: "HNX", label: "HNX" },
  { id: "HNX30", label: "HNX30" },
  { id: "UPCOM", label: "UPCOM" },
];

function toneMatch(
  match: number,
  ref: number,
  ceiling: number,
  floor: number,
): "ceiling" | "floor" | "ref" | "up" | "down" {
  if (ceiling > 0 && match >= ceiling - 1e-9) return "ceiling";
  if (floor > 0 && match <= floor + 1e-9) return "floor";
  if (ref <= 0) return "ref";
  if (match > ref) return "up";
  if (match < ref) return "down";
  return "ref";
}

function toneClass(t: ReturnType<typeof toneMatch>): string {
  switch (t) {
    case "ceiling":
      return "text-purple-400";
    case "floor":
      return "text-cyan-400";
    case "up":
      return "text-emerald-400";
    case "down":
      return "text-rose-400";
    default:
      return "text-amber-300";
  }
}

function th(
  children: ReactNode,
  className = "",
  colSpan = 1,
): ReactElement {
  return (
    <th
      colSpan={colSpan}
      className={`border border-[#1e293b] bg-[#0f1419] px-1 py-1 text-[9px] font-semibold uppercase tracking-wide text-[#94a3b8] ${className}`}
    >
      {children}
    </th>
  );
}

export function VpsPriceBoard() {
  const dispatch = useAppDispatch();
  const vpsUniverse = useAppSelector((s) => s.demo.vpsUniverse);
  const vpsBoardBySymbol = useAppSelector((s) => s.demo.vpsBoardBySymbol);
  const vpsSymbolOrder = useAppSelector((s) => s.demo.vpsSymbolOrder);
  const boardMarketTab = useAppSelector((s) => s.demo.boardMarketTab);
  const boardIndustryFilter = useAppSelector((s) => s.demo.boardIndustryFilter);
  const boardSearch = useAppSelector((s) => s.demo.boardSearch);
  const boardWatchlistId = useAppSelector((s) => s.demo.boardWatchlistId);
  const savedWatchlists = useAppSelector((s) => s.demo.savedWatchlists);
  const selectedSymbol = useAppSelector((s) => s.demo.selectedSymbol);
  const vpsLoading = useAppSelector((s) => s.demo.vpsLoading);
  const vpsError = useAppSelector((s) => s.demo.vpsError);

  const [searchOpen, setSearchOpen] = useState(false);
  const [wlOpen, setWlOpen] = useState(false);

  const metaBySym = useMemo(
    () => new Map(vpsUniverse.map((u) => [u.sym, u])),
    [vpsUniverse],
  );

  const industries = useMemo(() => {
    const set = new Set<string>();
    for (const u of vpsUniverse) {
      if (u.industry) set.add(u.industry);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "vi"));
  }, [vpsUniverse]);

  const visibleSymbols = useMemo(() => {
    const order =
      vpsSymbolOrder.length > 0
        ? vpsSymbolOrder
        : vpsUniverse.map((u) => u.sym);
    const wl =
      boardWatchlistId === "ALL"
        ? null
        : savedWatchlists.find((w) => w.id === boardWatchlistId);
    let syms = [...order];
    if (wl) {
      const set = new Set(wl.symbols);
      syms = syms.filter((s) => set.has(s));
    }
    const q = boardSearch.trim().toUpperCase();
    if (q) {
      syms = syms.filter(
        (s) =>
          s.includes(q) ||
          (metaBySym.get(s)?.name.toUpperCase().includes(q) ?? false),
      );
    }
    if (boardIndustryFilter) {
      syms = syms.filter(
        (s) => metaBySym.get(s)?.industry === boardIndustryFilter,
      );
    }
    if (boardMarketTab === "VN30") {
      syms = syms.filter((s) => VN30_SYMBOLS.has(s));
    } else if (boardMarketTab === "HOSE") {
      syms = syms.filter((s) => {
        const m = metaBySym.get(s)?.market;
        return m === "HOSE" || (m === "UNKNOWN" && VN30_SYMBOLS.has(s));
      });
    } else if (boardMarketTab === "HNX" || boardMarketTab === "HNX30") {
      syms = syms.filter((s) => metaBySym.get(s)?.market === "HNX");
    } else if (boardMarketTab === "UPCOM") {
      syms = syms.filter((s) => metaBySym.get(s)?.market === "UPCOM");
    }
    return syms.filter((s) => vpsBoardBySymbol[s]);
  }, [
    vpsSymbolOrder,
    vpsUniverse,
    boardWatchlistId,
    savedWatchlists,
    boardSearch,
    boardIndustryFilter,
    boardMarketTab,
    vpsBoardBySymbol,
    metaBySym,
  ]);

  const rows: VpsBoardRow[] = useMemo(
    () => visibleSymbols.map((s) => vpsBoardBySymbol[s]).filter(Boolean),
    [visibleSymbols, vpsBoardBySymbol],
  );

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col rounded-lg border border-[#1e293b] bg-[#050608] text-[10px] text-[#e2e8f0] shadow-lg">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#1e293b] bg-[#0a0e12] px-2 py-2">
        <input
          type="search"
          placeholder="Tìm kiếm mã CK"
          value={boardSearch}
          onChange={(e) => dispatch(setBoardSearch(e.target.value))}
          className="min-w-[140px] flex-1 rounded border border-[#1e293b] bg-[#0f1419] px-2 py-1.5 text-[11px] text-[#e2e8f0] placeholder:text-[#64748b] focus:outline-none focus:ring-1 focus:ring-amber-500/50 sm:max-w-[200px]"
        />
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="rounded bg-blue-600/90 px-2 py-1.5 text-[11px] font-medium text-white hover:bg-blue-500"
          title="Tra cứu mã từ cơ sở dữ liệu (1940 mã)"
        >
          🔍 Tra cứu
        </button>
        <select
          value={boardWatchlistId}
          onChange={(e) => dispatch(setBoardWatchlistId(e.target.value))}
          className="rounded border border-[#1e293b] bg-[#0f1419] px-2 py-1.5 text-[11px] text-[#e2e8f0]"
        >
          <option value="ALL">Watchlist — Tất cả</option>
          {savedWatchlists.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} ({w.symbols.length})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setWlOpen(true)}
          className="rounded bg-amber-600/90 px-2 py-1.5 text-[11px] font-medium text-black hover:bg-amber-500"
        >
          ⚙ Watchlist
        </button>
        <div className="hidden h-5 w-px bg-[#1e293b] sm:block" />
        <div className="flex flex-wrap gap-1">
          {MARKET_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => dispatch(setBoardMarketTab(t.id))}
              className={`rounded px-2 py-1 text-[10px] font-semibold ${
                boardMarketTab === t.id
                  ? "bg-amber-500/25 text-amber-300 ring-1 ring-amber-500/40"
                  : "text-[#94a3b8] hover:bg-[#1e293b]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select
          value={boardIndustryFilter}
          onChange={(e) => dispatch(setBoardIndustryFilter(e.target.value))}
          className="max-w-[180px] rounded border border-[#1e293b] bg-[#0f1419] px-2 py-1.5 text-[11px] text-[#e2e8f0]"
        >
          <option value="">Ngành — tất cả</option>
          {industries.map((ind) => (
            <option key={ind} value={ind}>
              {ind.slice(0, 48)}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={vpsLoading}
          onClick={() => void dispatch(loadVpsFullBoard())}
          className="ml-auto rounded bg-violet-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          {vpsLoading ? "Đang tải…" : "Tải bảng VPS"}
        </button>
      </div>
      {vpsError ? (
        <p className="border-b border-rose-900/50 bg-rose-950/40 px-2 py-1 text-[11px] text-rose-300">
          {vpsError}
        </p>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-max min-w-full border-collapse text-left font-mono tabular-nums">
          <thead className="sticky top-0 z-20 shadow-sm">
            <tr>
              {th("Mã CK", "sticky left-0 z-30 min-w-[52px] bg-[#0f1419]")}
              {th("Trần")}
              {th("Sàn")}
              {th("TC")}
              {th("Tổng KL")}
              {th("Giá 3", "", 1)}
              {th("KL 3")}
              {th("Giá 2")}
              {th("KL 2")}
              {th("Giá 1")}
              {th("KL 1")}
              {th("Giá", "bg-[#131920]")}
              {th("KL", "bg-[#131920]")}
              {th("+/-", "bg-[#131920]")}
              {th("%", "bg-[#131920]")}
              {th("Giá 1")}
              {th("KL 1")}
              {th("Giá 2")}
              {th("KL 2")}
              {th("Giá 3")}
              {th("KL 3")}
              {th("Cao")}
              {th("Thấp")}
              {th("TB")}
              {th("Mua NN")}
              {th("Bán NN")}
              {th("Room")}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const mt = toneMatch(r.matchP, r.ref, r.ceiling, r.floor);
              const rowSel = r.sym === selectedSymbol;
              return (
                <tr
                  key={r.sym}
                  onClick={() => dispatch(setSelectedSymbol(r.sym))}
                  className={`cursor-pointer border-b border-[#1a222c] hover:bg-[#0f1419] ${
                    rowSel ? "bg-blue-950/40" : ""
                  }`}
                >
                  <td className="sticky left-0 z-10 border border-[#1e293b] bg-[#050608] px-1.5 py-0.5 text-[11px] font-bold text-[#f8fafc]">
                    {r.sym}
                  </td>
                  <td className="border border-[#1e293b] px-1 py-0.5 text-purple-400">
                    {fmtVi(r.ceiling)}
                  </td>
                  <td className="border border-[#1e293b] px-1 py-0.5 text-cyan-400">
                    {fmtVi(r.floor)}
                  </td>
                  <td className="border border-[#1e293b] px-1 py-0.5 text-amber-300">
                    {fmtVi(r.ref)}
                  </td>
                  <td className="border border-[#1e293b] px-1 py-0.5 text-[#94a3b8]">
                    {fmtVolVi(r.totalVol)}
                  </td>
                  <td className="border border-[#1e293b] px-1 py-0.5 text-[#64748b]">
                    {fmtVi(r.bidP3)}
                  </td>
                  <td className="border border-[#1e293b] px-1 py-0.5 text-[#64748b]">
                    {fmtVolVi(r.bidV3)}
                  </td>
                  <td className="border border-[#1e293b] px-1 py-0.5 text-[#64748b]">
                    {fmtVi(r.bidP2)}
                  </td>
                  <td className="border border-[#1e293b] px-1 py-0.5 text-[#64748b]">
                    {fmtVolVi(r.bidV2)}
                  </td>
                  <td className="border border-[#1e293b] px-1 py-0.5 text-[#64748b]">
                    {fmtVi(r.bidP1)}
                  </td>
                  <td className="border border-[#1e293b] px-1 py-0.5 text-[#64748b]">
                    {fmtVolVi(r.bidV1)}
                  </td>
                  <td
                    className={`border border-[#1e293b] bg-[#0c1016] px-1 py-0.5 font-semibold ${toneClass(mt)}`}
                  >
                    {fmtVi(r.matchP)}
                  </td>
                  <td className="border border-[#1e293b] bg-[#0c1016] px-1 py-0.5 text-[#cbd5e1]">
                    {fmtVolVi(r.matchV)}
                  </td>
                  <td
                    className={`border border-[#1e293b] bg-[#0c1016] px-1 py-0.5 ${toneClass(mt)}`}
                  >
                    {fmtVi(r.changeAbs, 2)}
                  </td>
                  <td
                    className={`border border-[#1e293b] bg-[#0c1016] px-1 py-0.5 ${toneClass(mt)}`}
                  >
                    {fmtVi(r.changePct, 2)}%
                  </td>
                  <td className="border border-[#1e293b] px-1 py-0.5 text-[#64748b]">
                    {fmtVi(r.askP1)}
                  </td>
                  <td className="border border-[#1e293b] px-1 py-0.5 text-[#64748b]">
                    {fmtVolVi(r.askV1)}
                  </td>
                  <td className="border border-[#1e293b] px-1 py-0.5 text-[#64748b]">
                    {fmtVi(r.askP2)}
                  </td>
                  <td className="border border-[#1e293b] px-1 py-0.5 text-[#64748b]">
                    {fmtVolVi(r.askV2)}
                  </td>
                  <td className="border border-[#1e293b] px-1 py-0.5 text-[#64748b]">
                    {fmtVi(r.askP3)}
                  </td>
                  <td className="border border-[#1e293b] px-1 py-0.5 text-[#64748b]">
                    {fmtVolVi(r.askV3)}
                  </td>
                  <td className="border border-[#1e293b] px-1 py-0.5 text-[#94a3b8]">
                    {fmtVi(r.high)}
                  </td>
                  <td className="border border-[#1e293b] px-1 py-0.5 text-[#94a3b8]">
                    {fmtVi(r.low)}
                  </td>
                  <td className="border border-[#1e293b] px-1 py-0.5 text-[#94a3b8]">
                    {fmtVi(r.avg)}
                  </td>
                  <td className="border border-[#1e293b] px-1 py-0.5 text-[#64748b]">
                    {fmtVolVi(r.frBuy)}
                  </td>
                  <td className="border border-[#1e293b] px-1 py-0.5 text-[#64748b]">
                    {fmtVolVi(r.frSell)}
                  </td>
                  <td className="border border-[#1e293b] px-1 py-0.5 text-[#64748b]">
                    {fmtVolVi(r.frRoom)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length ? (
          <p className="p-6 text-center text-[12px] text-[#64748b]">
            Chưa có dòng nào — chọn Tải bảng VPS (app desktop) hoặc điều chỉnh bộ lọc / watchlist.
          </p>
        ) : null}
      </div>

      {/* Popups */}
      <StockSearchPopup open={searchOpen} onClose={() => setSearchOpen(false)} />
      <WatchlistPopup
        open={wlOpen}
        onClose={() => setWlOpen(false)}
        defaultSymbols={visibleSymbols.join(",")}
      />
    </div>
  );
}
