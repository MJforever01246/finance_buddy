"use client";

import type { ReactElement, ReactNode } from "react";
import { useMemo, useState } from "react";
import { fmtVi, fmtVolVi } from "@/lib/vps/formatVi";
import type { VpsBoardRow } from "@/lib/vps/types";
import { VN30_SYMBOLS } from "@/lib/vps/vn30";
import type { BoardMarketTab } from "@/stores/demoSlice";
import {
  loadIndayBoard,
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
      return "fb-tone-ceiling";
    case "floor":
      return "fb-tone-floor";
    case "up":
      return "fb-tone-up";
    case "down":
      return "fb-tone-down";
    default:
      return "fb-tone-ref";
  }
}

function th(
  children: ReactNode,
  className = "",
  colSpan = 1,
): ReactElement {
  return (
    <th colSpan={colSpan} className={`fb-board-th ${className}`}>
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
    <div className="fb-board">
      <div className="fb-board-toolbar">
        <input
          type="search"
          placeholder="Tìm kiếm mã CK"
          value={boardSearch}
          onChange={(e) => dispatch(setBoardSearch(e.target.value))}
          className="fb-board-input sm:max-w-[200px]"
        />
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="fb-toolbar-btn-primary px-2 py-1.5 text-[11px]"
          title="Tra cứu mã từ cơ sở dữ liệu (1940 mã)"
        >
          Tra cứu
        </button>
        <select
          value={boardWatchlistId}
          onChange={(e) => dispatch(setBoardWatchlistId(e.target.value))}
          className="fb-board-select"
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
          className="fb-toolbar-btn text-[11px]"
        >
          Watchlist
        </button>
        <div className="hidden h-5 w-px bg-[var(--border)] sm:block" />
        <div className="flex flex-wrap gap-1">
          {MARKET_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => dispatch(setBoardMarketTab(t.id))}
              className={`fb-board-tab ${boardMarketTab === t.id ? "fb-board-tab--active" : ""}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select
          value={boardIndustryFilter}
          onChange={(e) => dispatch(setBoardIndustryFilter(e.target.value))}
          className="fb-board-select max-w-[180px]"
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
          onClick={() => void dispatch(loadIndayBoard("hose"))}
          className="fb-toolbar-btn text-[11px] disabled:opacity-50"
          title="Snapshot HOSE từ test_data_inday (web/Tauri)"
        >
          HOSE offline
        </button>
        <button
          type="button"
          disabled={vpsLoading}
          onClick={() => void dispatch(loadIndayBoard("vn30"))}
          className="fb-toolbar-btn text-[11px] disabled:opacity-50"
        >
          VN30 offline
        </button>
        <button
          type="button"
          disabled={vpsLoading}
          onClick={() => void dispatch(loadVpsFullBoard())}
          className="fb-toolbar-btn-primary ml-auto px-3 py-1.5 text-[11px] disabled:opacity-50"
        >
          {vpsLoading ? "Đang tải…" : "Tải bảng VPS"}
        </button>
      </div>
      {vpsError ? (
        <p className="border-b border-[var(--down)]/30 bg-[var(--down-bg)] px-2 py-1 text-[11px] text-[var(--down)]">
          {vpsError}
        </p>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-max min-w-full border-collapse text-left">
          <thead className="sticky top-0 z-20 shadow-sm">
            <tr>
              {th("Mã CK", "sticky left-0 z-30 min-w-[52px] bg-[var(--surface)]")}
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
              {th("Giá", "fb-board-match")}
              {th("KL", "fb-board-match")}
              {th("+/-", "fb-board-match")}
              {th("%", "fb-board-match")}
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
                  className={`fb-board-row cursor-pointer border-b border-[var(--border)] ${rowSel ? "fb-board-row--selected" : ""}`}
                >
                  <td className="fb-board-td sticky left-0 z-10 bg-[var(--surface-2)] text-[11px] font-bold">
                    {r.sym}
                  </td>
                  <td className={`fb-board-td fb-tone-ceiling`}>
                    {fmtVi(r.ceiling)}
                  </td>
                  <td className={`fb-board-td fb-tone-floor`}>
                    {fmtVi(r.floor)}
                  </td>
                  <td className={`fb-board-td fb-tone-ref`}>
                    {fmtVi(r.ref)}
                  </td>
                  <td className="fb-board-td text-[var(--muted)]">
                    {fmtVolVi(r.totalVol)}
                  </td>
                  <td className="fb-board-td text-[var(--muted)]">
                    {fmtVi(r.bidP3)}
                  </td>
                  <td className="fb-board-td text-[var(--muted)]">
                    {fmtVolVi(r.bidV3)}
                  </td>
                  <td className="fb-board-td text-[var(--muted)]">
                    {fmtVi(r.bidP2)}
                  </td>
                  <td className="fb-board-td text-[var(--muted)]">
                    {fmtVolVi(r.bidV2)}
                  </td>
                  <td className="fb-board-td text-[var(--muted)]">
                    {fmtVi(r.bidP1)}
                  </td>
                  <td className="fb-board-td text-[var(--muted)]">
                    {fmtVolVi(r.bidV1)}
                  </td>
                  <td
                    className={`fb-board-td fb-board-match font-semibold ${toneClass(mt)}`}
                  >
                    {fmtVi(r.matchP)}
                  </td>
                  <td className="fb-board-td fb-board-match text-[var(--text)]">
                    {fmtVolVi(r.matchV)}
                  </td>
                  <td
                    className={`fb-board-td fb-board-match ${toneClass(mt)}`}
                  >
                    {fmtVi(r.changeAbs, 2)}
                  </td>
                  <td
                    className={`fb-board-td fb-board-match ${toneClass(mt)}`}
                  >
                    {fmtVi(r.changePct, 2)}%
                  </td>
                  <td className="fb-board-td text-[var(--muted)]">
                    {fmtVi(r.askP1)}
                  </td>
                  <td className="fb-board-td text-[var(--muted)]">
                    {fmtVolVi(r.askV1)}
                  </td>
                  <td className="fb-board-td text-[var(--muted)]">
                    {fmtVi(r.askP2)}
                  </td>
                  <td className="fb-board-td text-[var(--muted)]">
                    {fmtVolVi(r.askV2)}
                  </td>
                  <td className="fb-board-td text-[var(--muted)]">
                    {fmtVi(r.askP3)}
                  </td>
                  <td className="fb-board-td text-[var(--muted)]">
                    {fmtVolVi(r.askV3)}
                  </td>
                  <td className="fb-board-td text-[var(--muted)]">
                    {fmtVi(r.high)}
                  </td>
                  <td className="fb-board-td text-[var(--muted)]">
                    {fmtVi(r.low)}
                  </td>
                  <td className="fb-board-td text-[var(--muted)]">
                    {fmtVi(r.avg)}
                  </td>
                  <td className="fb-board-td text-[var(--muted)]">
                    {fmtVolVi(r.frBuy)}
                  </td>
                  <td className="fb-board-td text-[var(--muted)]">
                    {fmtVolVi(r.frSell)}
                  </td>
                  <td className="fb-board-td text-[var(--muted)]">
                    {fmtVolVi(r.frRoom)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length ? (
          <p className="p-6 text-center text-[12px] text-[var(--muted)]">
            Chưa có dòng nào — bấm <strong>HOSE/VN30 offline</strong> (web) hoặc{" "}
            <strong>Tải bảng VPS</strong> (desktop).
          </p>
        ) : null}
      </div>

      <StockSearchPopup open={searchOpen} onClose={() => setSearchOpen(false)} />
      <WatchlistPopup
        open={wlOpen}
        onClose={() => setWlOpen(false)}
        defaultSymbols={visibleSymbols.join(",")}
      />
    </div>
  );
}
