"use client";

import { useMemo } from "react";
import { useDemoStore } from "@/stores/demo-store";

export function MarketHeader() {
  const prices = useDemoStore((s) => s.prices);
  const watchlist = useDemoStore((s) => s.watchlist);

  const tape = useMemo(() => {
    const keys = Array.from(
      new Set([...Object.keys(prices), ...watchlist]),
    );
    return keys.map((sym) => ({
      sym,
      px: prices[sym] ?? 0,
    }));
  }, [prices, watchlist]);

  return (
    <div className="flex h-9 items-center overflow-hidden border-b border-[var(--border)] bg-[var(--surface-2)] text-xs">
      <span className="shrink-0 border-r border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-semibold text-[var(--muted)]">
        Watch
      </span>
      <div className="flex min-w-0 flex-1 overflow-x-auto whitespace-nowrap scrollbar-none">
        {tape.map(({ sym, px }) => (
          <span
            key={sym}
            className="inline-flex items-center gap-2 border-r border-[var(--border)] px-4 py-2 font-mono tabular-nums"
          >
            <span className="font-semibold text-[var(--text)]">{sym}</span>
            <span className="text-[var(--muted)]">{px ? px.toFixed(2) : "—"}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
