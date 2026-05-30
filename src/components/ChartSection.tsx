"use client";

import { useState } from "react";
import { LightweightChart } from "./LightweightChart";
import { TradingViewChart } from "./TradingViewChart";

type ChartEngine = "lightweight" | "tradingview";

export function ChartSection() {
  const [engine, setEngine] = useState<ChartEngine>("lightweight");

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
          Engine biểu đồ
        </span>
        <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
          <button
            type="button"
            onClick={() => setEngine("lightweight")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              engine === "lightweight"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            Lightweight Charts
          </button>
          <button
            type="button"
            onClick={() => setEngine("tradingview")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              engine === "tradingview"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            TradingView (full)
          </button>
        </div>
        <span className="text-[10px] text-[var(--muted)]">
          Cùng OHLCV ·{" "}
          <code className="rounded bg-[var(--surface-2)] px-1">fetchChartBars</code>
        </span>
      </div>

      {engine === "lightweight" ? <LightweightChart /> : <TradingViewChart />}
    </section>
  );
}
