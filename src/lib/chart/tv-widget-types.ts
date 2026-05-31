/** Types cho TradingView widget — tránh import từ public/chart. */

export type SupportedLineTools =
  | "measure"
  | "date_and_price_range"
  | "price_range"
  | "date_range"
  | "trend_line"
  | "fib_retracement"
  | "long_position"
  | "short_position"
  | "horizontal_line"
  | "parallel_channel"
  | "cursor";

export interface TvChartApi {
  setTimezone: (tz: string) => void;
  createStudy: (
    name: string,
    forceOverlay: boolean,
    lock?: boolean,
    inputs?: (string | number)[],
  ) => unknown;
  getAllStudies?: () => { name: string }[];
  removeAllStudies?: () => void;
  removeAllShapes?: () => void;
  executeActionById?: (id: string) => void;
}

export interface TvWidgetApi {
  onChartReady: (cb: () => void) => void;
  remove: () => void;
  activeChart: () => TvChartApi;
  selectLineTool: (tool: SupportedLineTools) => void;
  setSymbol: (symbol: string, interval: string, callback: () => void) => void;
  chart: () => TvChartApi;
}

declare global {
  interface Window {
    TradingView: {
      widget: new (config: Record<string, unknown>) => TvWidgetApi;
      version?: string;
      onready?: (cb: () => void) => void;
    };
  }
}

export {};
