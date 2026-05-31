"use client";

import { useEffect, useRef, useState } from "react";
import { useAppSelector } from "@/stores/hooks";
import { createCustomDatafeed } from "@/lib/chart/datafeed";
import { resolveCompanyName } from "@/lib/chart/resolve-symbol";
import {
  applyDefaultStudies,
  buildTradingViewWidgetOptions,
  TV_DARK,
} from "@/lib/chart/tv-config";
import { ensureTradingViewLibrary } from "@/lib/chart/load-tradingview";
import { tvError, tvLog } from "@/lib/chart/tv-log";
import type { SupportedLineTools, TvWidgetApi } from "@/lib/chart/tv-widget-types";
import { isTauriRuntime } from "@/lib/tauri-env";
import { ChartAnalysisPanel } from "./ChartAnalysisPanel";
import { ChartDebugPanel } from "./ChartDebugPanel";
import { ChartMeasureToolbar } from "./ChartMeasureToolbar";

export function TradingViewChart() {
  const selectedSymbol = useAppSelector((s) => s.demo.selectedSymbol);
  const [ready, setReady] = useState(false);
  const [chartReady, setChartReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("");
  const widgetRef = useRef<TvWidgetApi | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const symbolRef = useRef(selectedSymbol || "ACB");

  const symbol = selectedSymbol || "ACB";

  useEffect(() => {
    let cancelled = false;
    void resolveCompanyName(symbol).then((name) => {
      if (!cancelled) setCompanyName(name);
    });
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        await ensureTradingViewLibrary();
        if (cancelled) return;
        setReady(true);
      } catch (e) {
        tvError("loadScript failed", e);
        setError(e instanceof Error ? e.message : "Không load được TradingView library");
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Tạo widget một lần — tránh destroy/recreate làm hỏng container. */
  useEffect(() => {
    if (!ready || !containerRef.current || !window.TradingView) return;
    if (widgetRef.current) return;

    const el = containerRef.current;
    el.innerHTML = "";

    const datafeed = createCustomDatafeed();
    const options = buildTradingViewWidgetOptions({
      symbol: symbolRef.current,
      palette: TV_DARK,
      datafeed,
    });

    tvLog("widget create (once)", { symbol: symbolRef.current });

    try {
      const widget = new window.TradingView.widget(options);
      widget.onChartReady(() => {
        tvLog("onChartReady");
        setChartReady(true);
        setError(null);
        try {
          const chart = widget.activeChart();
          chart.setTimezone("Asia/Bangkok");
          window.setTimeout(() => applyDefaultStudies(chart), 400);
        } catch (e) {
          tvError("onChartReady setup", e);
        }
      });
      widgetRef.current = widget;
    } catch (e) {
      tvError("widget constructor", e);
      setError(e instanceof Error ? e.message : "Không tạo được widget TradingView");
    }

    return () => {
      setChartReady(false);
      if (widgetRef.current) {
        try {
          widgetRef.current.remove();
        } catch {
          /* ignore */
        }
        widgetRef.current = null;
      }
      el.innerHTML = "";
    };
  }, [ready]);

  /** Đổi mã — dùng setSymbol, không recreate widget. */
  useEffect(() => {
    if (!chartReady || !widgetRef.current) return;
    if (symbolRef.current === symbol) return;

    symbolRef.current = symbol;
    tvLog("setSymbol", { symbol });

    try {
      widgetRef.current.setSymbol(symbol, "D", () => {
        tvLog("setSymbol done", { symbol });
      });
    } catch (e) {
      tvError("setSymbol", e);
    }
  }, [symbol, chartReady]);

  useEffect(() => {
    if (!ready || chartReady) return;
    const t = window.setTimeout(() => {
      if (!chartReady) {
        setError((prev) =>
          prev ??
          "Chart chưa sẵn sàng sau 20s — mở F12, filter [TV datafeed], xem getBars/resolveSymbol.",
        );
      }
    }, 20000);
    return () => window.clearTimeout(t);
  }, [ready, chartReady, symbol]);

  const selectTool = (tool: SupportedLineTools) => {
    try {
      widgetRef.current?.selectLineTool(tool);
    } catch (e) {
      tvError("selectLineTool", e);
    }
  };

  const onMagnet = () => {
    try {
      widgetRef.current?.activeChart().executeActionById?.("magnetAction");
    } catch (e) {
      tvError("magnetAction", e);
    }
  };

  const onResetDrawings = () => {
    try {
      widgetRef.current?.activeChart().removeAllShapes?.();
    } catch (e) {
      tvError("removeAllShapes", e);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-[#363c4e] bg-[#131722] shadow-lg">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#363c4e] px-4 py-2.5">
        <h3 className="text-sm font-semibold text-[#d1d4dc]">Biểu đồ kỹ thuật</h3>
        <span className="max-w-[min(100%,420px)] truncate text-xs text-[#787b86]">
          {companyName || symbol} · 1D · HOSE
        </span>
        <span className="rounded bg-[#2a2e39] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#2962ff]">
          {symbol}
        </span>
        <span className="text-[10px] text-[#787b86]">
          TradingView · {isTauriRuntime() ? "VPS / SQLite" : "JSON mẫu"}
        </span>
        {!chartReady && ready && (
          <span className="ml-auto text-[10px] text-[#787b86]">Đang tải chart…</span>
        )}
      </div>

      <ChartMeasureToolbar
        disabled={!chartReady}
        onSelectTool={selectTool}
        onMagnet={onMagnet}
        onResetDrawings={onResetDrawings}
      />

      {error && <div className="px-4 py-3 text-sm text-rose-400">{error}</div>}

      <div
        ref={containerRef}
        id="tv_chart_container"
        className="w-full min-h-[560px]"
        style={{ height: "560px" }}
      />

      <ChartAnalysisPanel />
      <ChartDebugPanel />
    </div>
  );
}
