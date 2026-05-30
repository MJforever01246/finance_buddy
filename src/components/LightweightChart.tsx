"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useAppSelector } from "@/stores/hooks";
import {
  fetchChartBars,
  toLightweightCandles,
  toLightweightVolume,
} from "@/lib/chart/bars";
import { reportChartDebug } from "@/lib/chart/debug";
import { isTauriRuntime } from "@/lib/tauri-env";
import { ChartDebugPanel } from "./ChartDebugPanel";

export function LightweightChart() {
  const { resolvedTheme } = useTheme();
  const selectedSymbol = useAppSelector((s) => s.demo.selectedSymbol);
  const symbol = selectedSymbol || "ACB";
  const isDark = resolvedTheme === "dark";

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof import("lightweight-charts")["createChart"]> | null>(
    null,
  );
  const [status, setStatus] = useState<"loading" | "ok" | "empty" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let disposed = false;
    let resizeObs: ResizeObserver | null = null;

    async function render() {
      setStatus("loading");
      setError(null);

      const result = await fetchChartBars(symbol, "D");
      if (disposed) return;

      reportChartDebug({
        symbol,
        resolution: "D",
        fromSec: 0,
        toSec: Math.floor(Date.now() / 1000),
        source: result.source,
        barCount: result.bars.length,
        noData: result.bars.length === 0,
        detail: `[LW] ${result.detail}`,
        error: result.error ?? null,
        bars: result.bars,
      });

      if (result.bars.length === 0) {
        chartRef.current?.remove();
        chartRef.current = null;
        setStatus("empty");
        setError(result.detail);
        return;
      }

      const { createChart, ColorType, CrosshairMode, CandlestickSeries, HistogramSeries } =
        await import("lightweight-charts");
      if (disposed) return;

      chartRef.current?.remove();
      el.innerHTML = "";

      const bg = isDark ? "#0a0e14" : "#ffffff";
      const text = isDark ? "#94a3b8" : "#555555";
      const grid = isDark ? "#1e293b" : "#e2e8f0";

      const chart = createChart(el, {
        width: el.clientWidth,
        height: 480,
        layout: {
          background: { type: ColorType.Solid, color: bg },
          textColor: text,
        },
        grid: {
          vertLines: { color: grid },
          horzLines: { color: grid },
        },
        crosshair: { mode: CrosshairMode.Normal },
        timeScale: {
          borderColor: grid,
          timeVisible: true,
          secondsVisible: false,
        },
        rightPriceScale: { borderColor: grid },
      });

      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#4ade80",
        downColor: "#f87171",
        borderUpColor: "#4ade80",
        borderDownColor: "#f87171",
        wickUpColor: "#4ade80",
        wickDownColor: "#f87171",
      });
      candleSeries.setData(toLightweightCandles(result.bars));

      const volSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "",
      });
      volSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
      volSeries.setData(toLightweightVolume(result.bars));

      chart.timeScale().fitContent();
      chartRef.current = chart;

      resizeObs = new ResizeObserver(() => {
        if (el && chartRef.current) {
          chartRef.current.applyOptions({ width: el.clientWidth });
        }
      });
      resizeObs.observe(el);

      setStatus("ok");
    }

    void render();

    return () => {
      disposed = true;
      resizeObs?.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
    };
  }, [symbol, isDark]);

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-2.5">
        <h3 className="text-sm font-semibold text-[var(--text)]">Biểu đồ kỹ thuật</h3>
        <span className="rounded bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
          {symbol}
        </span>
        <span className="text-[10px] text-[var(--muted)]">
          Lightweight Charts · {isTauriRuntime() ? "VPS / SQLite" : "JSON mẫu"}
        </span>
        {status === "loading" && (
          <span className="ml-auto text-[10px] text-[var(--muted)]">Đang tải…</span>
        )}
      </div>
      {status === "empty" && (
        <p className="px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          Không có dữ liệu: {error}
        </p>
      )}
      {status === "error" && (
        <p className="px-4 py-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>
      )}
      <div ref={containerRef} className="w-full min-h-[480px]" />
      <ChartDebugPanel />
    </div>
  );
}
