"use client";

import { useMemo } from "react";
import type { MarketTick } from "@/lib/layers/shared/types";
import { useDemoStore } from "@/stores/demo-store";

function lastTickForSymbol(ticks: MarketTick[], symbol: string): MarketTick | undefined {
  return ticks.find((t) => t.symbol === symbol);
}

export function MarketBoardTable() {
  const prices = useDemoStore((s) => s.prices);
  const ticks = useDemoStore((s) => s.ticks);
  const selectedSymbol = useDemoStore((s) => s.selectedSymbol);
  const setSelectedSymbol = useDemoStore((s) => s.setSelectedSymbol);

  const rows = useMemo(() => {
    return Object.keys(prices)
      .sort()
      .map((sym) => {
        const tick = lastTickForSymbol(ticks, sym);
        const price = prices[sym] ?? 0;
        const changePct = tick?.changePct ?? 0;
        const vol = tick?.volume ?? 0;
        const up = changePct >= 0;
        return { sym, price, changePct, vol, up };
      });
  }, [prices, ticks]);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
        <h2 className="text-sm font-semibold text-[var(--text)]">Bảng giá (demo)</h2>
        <span className="text-[10px] text-[var(--muted)]">Bấm dòng để xem chi tiết →</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-[var(--surface-2)] text-left text-xs text-[var(--muted)]">
            <tr>
              <th className="border-b border-[var(--border)] px-3 py-2 font-medium">Mã</th>
              <th className="border-b border-[var(--border)] px-3 py-2 text-right font-medium">
                Giá
              </th>
              <th className="border-b border-[var(--border)] px-3 py-2 text-right font-medium">
                ±%
              </th>
              <th className="hidden border-b border-[var(--border)] px-3 py-2 text-right font-medium sm:table-cell">
                KL
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.sym}
                onClick={() => setSelectedSymbol(r.sym)}
                className={`cursor-pointer border-b border-[var(--border)] font-mono tabular-nums transition-colors hover:bg-[var(--surface-2)] ${
                  selectedSymbol === r.sym ? "bg-blue-500/10 ring-1 ring-inset ring-blue-500/30" : ""
                }`}
              >
                <td className="px-3 py-2 font-semibold text-[var(--text)]">{r.sym}</td>
                <td className="px-3 py-2 text-right">{r.price.toFixed(2)}</td>
                <td
                  className={`px-3 py-2 text-right font-medium ${
                    r.up ? "text-[var(--up)]" : "text-[var(--down)]"
                  }`}
                >
                  {r.changePct >= 0 ? "+" : ""}
                  {r.changePct.toFixed(2)}%
                </td>
                <td className="hidden px-3 py-2 text-right text-xs text-[var(--muted)] sm:table-cell">
                  {r.vol ? (r.vol / 1000).toFixed(1) + "k" : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
