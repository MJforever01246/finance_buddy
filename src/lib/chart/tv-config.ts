/**
 * Cấu hình TradingView Advanced Charts — dark pro layout.
 * Thư viện: public/chart/charting_library/ v1.12 (API getBars legacy).
 * Giữ config tối giản — tránh override/feature không hỗ trợ gây widget không render.
 */

import type { createCustomDatafeed } from "./datafeed";

export const TV_DARK = {
  bg: "#131722",
  grid: "#363c4e",
  text: "#d1d4dc",
  up: "#26a69a",
  down: "#ef5350",
  toolbar: "#131722",
} as const;

export type TvPalette = typeof TV_DARK;

export function buildTradingViewWidgetOptions(args: {
  symbol: string;
  palette: TvPalette;
  datafeed: ReturnType<typeof createCustomDatafeed>;
}) {
  const { symbol, palette, datafeed } = args;

  return {
    symbol: symbol.toUpperCase(),
    interval: "D" as const,
    timezone: "Asia/Bangkok" as const,
    container_id: "tv_chart_container",
    datafeed,
    library_path: "/chart/charting_library/",
    locale: "vi",
    debug: process.env.NODE_ENV === "development",
    fullscreen: false,
    autosize: true,
    toolbar_bg: palette.toolbar,
    loading_screen: {
      backgroundColor: palette.bg,
      foregroundColor: palette.text,
    },
    disabled_features: [
      "use_localstorage_for_settings",
      "go_to_date",
      "header_symbol_search",
      "study_templates",
    ],
    enabled_features: ["move_logo_to_main_pane", "side_toolbar_in_fullscreen_mode"],
    overrides: {
      "paneProperties.background": palette.bg,
      "paneProperties.vertGridProperties.color": palette.grid,
      "paneProperties.horzGridProperties.color": palette.grid,
      "symbolWatermarkProperties.transparency": 92,
      "scalesProperties.textColor": palette.text,
      "scalesProperties.showSeriesLastValue": true,
      "scalesProperties.showStudyLastValue": true,
      "mainSeriesProperties.candleStyle.upColor": palette.up,
      "mainSeriesProperties.candleStyle.downColor": palette.down,
      "mainSeriesProperties.candleStyle.borderUpColor": palette.up,
      "mainSeriesProperties.candleStyle.borderDownColor": palette.down,
      "mainSeriesProperties.candleStyle.wickUpColor": palette.up,
      "mainSeriesProperties.candleStyle.wickDownColor": palette.down,
    },
    time_frames: [
      { text: "1D", resolution: "D", description: "1 ngày", title: "1D" },
      { text: "1W", resolution: "W", description: "1 tuần", title: "1W" },
      { text: "1M", resolution: "M", description: "1 tháng", title: "1M" },
    ],
    client_id: "finance-buddy",
    user_id: "local_user",
    width: "100%",
  };
}

/** Gắn indicator sau khi chart sẵn sàng — từng study riêng, không throw. */
export function applyDefaultStudies(chart: {
  createStudy: (
    name: string,
    forceOverlay: boolean,
    lock?: boolean,
    inputs?: (string | number)[],
  ) => unknown;
  getAllStudies?: () => { name: string }[];
}) {
  const existing = chart.getAllStudies?.().map((s) => s.name.toLowerCase()) ?? [];

  const add = (name: string, overlay: boolean, inputs?: (string | number)[]) => {
    try {
      chart.createStudy(name, overlay, false, inputs);
    } catch {
      /* study có thể đã tồn tại hoặc lib cũ không hỗ trợ input */
    }
  };

  if (!existing.some((n) => n.includes("volume"))) {
    add("Volume@tv-basicstudies", false);
  }
  if (!existing.some((n) => n.includes("moving average"))) {
    add("Moving Average@tv-basicstudies", true, ["close", 20, 0]);
  }
  if (!existing.some((n) => n.includes("rsi"))) {
    add("RSI@tv-basicstudies", false, [14]);
  }
}
