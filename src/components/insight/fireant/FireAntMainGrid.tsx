"use client";

import { useMemo } from "react";
import { concentrationRisk } from "@/lib/layers/data";
import { fmtVi } from "@/lib/vps/formatVi";
import { DEMO_BOOKS, type DemoBook } from "@/lib/insight/demoBooks";
import { bookPositions, pricesForBook, summarizeBook } from "@/lib/insight/bookMetrics";

export type MainView = "books" | "holdings" | "insight";

function roleLabel(role: DemoBook["role"]) {
  if (role === "own") return "Của tôi";
  if (role === "client") return "Khách";
  return "Giả định";
}

function plClass(pct: number) {
  if (pct > 0.05) return "text-up";
  if (pct < -0.05) return "text-down";
  return "text-ref";
}

export function FireAntMainGrid({
  view,
  onViewChange,
  activeBookId,
  reduxPositions,
  basePrices,
  insights,
  onSelectBook,
}: {
  view: MainView;
  onViewChange: (v: MainView) => void;
  activeBookId: string;
  reduxPositions: import("@/lib/layers/types").Position[];
  basePrices: Record<string, number>;
  insights: import("@/lib/layers/types").Insight[];
  onSelectBook: (id: string) => void;
}) {
  const activeBook = DEMO_BOOKS.find((b) => b.id === activeBookId) ?? DEMO_BOOKS[0];

  const bookRows = useMemo(
    () =>
      DEMO_BOOKS.map((book) => {
        const s = summarizeBook(book, reduxPositions, basePrices);
        return { book, ...s };
      }),
    [reduxPositions, basePrices],
  );

  const holdings = useMemo(() => {
    const positions = bookPositions(activeBook, reduxPositions);
    const prices = pricesForBook(activeBook, basePrices);
    const { weights } = concentrationRisk(positions, prices);
    return positions.map((p) => {
      const px = prices[p.symbol] ?? p.avgCost;
      const pl = ((px - p.avgCost) / p.avgCost) * 100;
      const w = weights.find((x) => x.symbol === p.symbol)?.pct ?? 0;
      return { ...p, px, pl, weight: w };
    });
  }, [activeBook, reduxPositions, basePrices]);

  const toolbarTabs: { id: MainView; label: string }[] = [
    { id: "books", label: "Đa danh mục" },
    { id: "holdings", label: "Vị thế" },
    { id: "insight", label: "Insight" },
  ];

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div
        className="flex shrink-0 flex-wrap items-center gap-1 border-b px-2 py-1"
        style={{ borderColor: "var(--fa-border)", background: "var(--fa-surface-2)" }}
      >
        {toolbarTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onViewChange(t.id)}
            className={`rounded px-2 py-0.5 text-[10px] ${
              view === t.id ? "bg-[var(--fa-accent)]/25 font-medium text-[var(--fa-accent)]" : "text-[var(--fa-muted)] hover:text-[var(--fa-text)]"
            }`}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-2 text-[10px] text-[var(--fa-muted)]">|</span>
        {DEMO_BOOKS.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => onSelectBook(b.id)}
            className={`rounded px-2 py-0.5 text-[10px] ${
              b.id === activeBookId
                ? "bg-white/10 text-[var(--fa-text)]"
                : "text-[var(--fa-muted)] hover:text-[var(--fa-text)]"
            }`}
          >
            {b.label.replace("Danh mục · ", "").replace("Khách · ", "")}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {view === "books" && (
          <table className="w-full min-w-[640px] border-collapse text-[11px]">
            <thead>
              <tr>
                <th className="fa-th">Danh mục</th>
                <th className="fa-th">Loại</th>
                <th className="fa-th text-right">Giá trị</th>
                <th className="fa-th text-right">P/L %</th>
                <th className="fa-th text-right">Risk</th>
                <th className="fa-th text-right">Tập trung</th>
                <th className="fa-th">Mã chính</th>
              </tr>
            </thead>
            <tbody>
              {bookRows.map(({ book, market, pnlPct, risk, maxSymbol, maxPct }) => (
                <tr
                  key={book.id}
                  className={`fa-row cursor-pointer ${book.id === activeBookId ? "fa-row-selected" : ""}`}
                  onClick={() => onSelectBook(book.id)}
                >
                  <td className="fa-cell font-semibold">{book.label}</td>
                  <td className="fa-cell text-[var(--fa-muted)]">{roleLabel(book.role)}</td>
                  <td className="fa-cell text-right">{fmtVi(market / 1e6, 2)}M</td>
                  <td className={`fa-cell text-right font-medium ${plClass(pnlPct)}`}>
                    {pnlPct >= 0 ? "+" : ""}
                    {pnlPct.toFixed(2)}
                  </td>
                  <td className="fa-cell text-right">{risk}</td>
                  <td className="fa-cell text-right">{maxPct.toFixed(0)}%</td>
                  <td className="fa-cell">{maxSymbol || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {view === "holdings" && (
          <table className="w-full min-w-[720px] border-collapse text-[11px]">
            <thead>
              <tr>
                <th className="fa-th">Mã CK</th>
                <th className="fa-th text-right">KL</th>
                <th className="fa-th text-right">Giá</th>
                <th className="fa-th text-right">+/- %</th>
                <th className="fa-th text-right">Trọng số</th>
                <th className="fa-th text-right">Giá vốn</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => (
                <tr key={h.symbol} className="fa-row">
                  <td className="fa-cell font-semibold text-[var(--fa-accent)]">{h.symbol}</td>
                  <td className="fa-cell text-right">{h.qty}</td>
                  <td className="fa-cell text-right">{fmtVi(h.px, 2)}</td>
                  <td className={`fa-cell text-right font-medium ${plClass(h.pl)}`}>
                    {h.pl >= 0 ? "+" : ""}
                    {h.pl.toFixed(2)}
                  </td>
                  <td className="fa-cell text-right">{h.weight.toFixed(1)}%</td>
                  <td className="fa-cell text-right text-[var(--fa-muted)]">{fmtVi(h.avgCost, 2)}</td>
                </tr>
              ))}
              {!holdings.length ? (
                <tr>
                  <td colSpan={6} className="fa-cell py-8 text-center text-[var(--fa-muted)]">
                    Chưa có vị thế — nạp PF demo.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}

        {view === "insight" && (
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr>
                <th className="fa-th">Thời gian</th>
                <th className="fa-th">Mức</th>
                <th className="fa-th">Tiêu đề</th>
                <th className="fa-th">Mã</th>
              </tr>
            </thead>
            <tbody>
              {insights.length ? (
                insights.map((ins) => (
                  <tr key={ins.id} className="fa-row">
                    <td className="fa-cell text-[var(--fa-muted)]">
                      {new Date(ins.ts).toLocaleTimeString("vi-VN")}
                    </td>
                    <td className={`fa-cell uppercase ${ins.severity === "risk" ? "text-down" : ins.severity === "warn" ? "text-ref" : ""}`}>
                      {ins.severity}
                    </td>
                    <td className="fa-cell max-w-md truncate">{ins.title}</td>
                    <td className="fa-cell">{ins.relatedSymbols.join(", ")}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="fa-cell py-8 text-center text-[var(--fa-muted)]">
                    Chưa có insight cho sổ này — Tick / Live hoặc đổi sổ danh mục.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
