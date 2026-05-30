"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useAppSelector } from "@/stores/hooks";
import { createCustomDatafeed } from "@/lib/chart/datafeed";
import { isTauriRuntime } from "@/lib/tauri-env";
import { ChartDebugPanel } from "./ChartDebugPanel";

declare global {
  interface Window {
    TradingView: {
      widget: new (config: Record<string, unknown>) => TvWidget;
    };
  }
}

interface TvWidget {
  onChartReady: (cb: () => void) => void;
  remove: () => void;
  activeChart: () => { setTimezone: (tz: string) => void };
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

export function TradingViewChart() {
  const { resolvedTheme } = useTheme();
  const selectedSymbol = useAppSelector((s) => s.demo.selectedSymbol);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const widgetRef = useRef<TvWidget | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const symbol = selectedSymbol || "ACB";
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        await loadScript("/chart/charting_library/charting_library.min.js");
        if (cancelled) return;
        setReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Không load được TradingView library");
      }
    }

    void init();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current) return;
    if (!window.TradingView) return;

    if (widgetRef.current) {
      try { widgetRef.current.remove(); } catch { /* ignore */ }
      widgetRef.current = null;
    }

    const bgColor = isDark ? "#0a0e14" : "#ffffff";
    const gridColor = isDark ? "#1e293b" : "#e2e8f0";
    const textColor = isDark ? "#94a3b8" : "#555555";

    const widget = new window.TradingView.widget({
      symbol: symbol,
      interval: "D",
      timezone: "Asia/Bangkok",
      container_id: "tv_chart_container",
      datafeed: createCustomDatafeed(),
      library_path: "/chart/charting_library/",
      locale: "vi",
      fullscreen: false,
      autosize: true,
      disabled_features: [
        "use_localstorage_for_settings",
        "go_to_date",
        "header_symbol_search",
        "study_templates",
      ],
      enabled_features: [
        "move_logo_to_main_pane",
      ],
      toolbar_bg: bgColor,
      overrides: {
        "paneProperties.background": bgColor,
        "paneProperties.vertGridProperties.color": gridColor,
        "paneProperties.horzGridProperties.color": gridColor,
        "symbolWatermarkProperties.transparency": 1,
        "scalesProperties.textColor": textColor,
        "scalesProperties.scaleSeriesOnly": false,
        "scalesProperties.showSeriesLastValue": true,
        "scalesProperties.showSeriesPrevCloseValue": false,
        "scalesProperties.showStudyLastValue": false,
        "scalesProperties.showStudyPlotLabels": false,
        "scalesProperties.showSymbolLabels": false,
        "mainSeriesProperties.candleStyle.upColor": "#4ade80",
        "mainSeriesProperties.candleStyle.downColor": "#f87171",
        "mainSeriesProperties.candleStyle.borderUpColor": "#4ade80",
        "mainSeriesProperties.candleStyle.borderDownColor": "#f87171",
        "mainSeriesProperties.candleStyle.wickUpColor": "#4ade80",
        "mainSeriesProperties.candleStyle.wickDownColor": "#f87171",
      },
      time_frames: [
        { text: "1D", resolution: "D", description: "1 ngày", title: "1D" },
        { text: "1W", resolution: "W", description: "1 tuần", title: "1W" },
        { text: "1M", resolution: "M", description: "1 tháng", title: "1M" },
      ],
      client_id: "finance-buddy",
      user_id: "local_user",
      width: "100%",
    });

    widget.onChartReady(() => {
      widget.activeChart().setTimezone("Asia/Bangkok");
    });

    widgetRef.current = widget;

    return () => {
      if (widgetRef.current) {
        try { widgetRef.current.remove(); } catch { /* ignore */ }
        widgetRef.current = null;
      }
    };
  }, [ready, symbol, isDark]);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-2.5">
        <h3 className="text-sm font-semibold text-[var(--text)]">
          Biểu đồ kỹ thuật
        </h3>
        <span className="rounded bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-300">
          {symbol}
        </span>
        <span className="text-[10px] text-[var(--muted)]">
          TradingView · {isTauriRuntime() ? "VPS Live" : "Dữ liệu mẫu"}
        </span>
      </div>
      {error && (
        <div className="px-4 py-3 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}
      <div
        ref={containerRef}
        id="tv_chart_container"
        className="w-full"
        style={{ height: "520px" }}
      />
      <ChartDebugPanel />
    </div>
  );
}
