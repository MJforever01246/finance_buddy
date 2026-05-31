/**
 * Custom TradingView Datafeed — wrapper quanh fetchChartBars (shared OHLCV).
 *
 * API getBars của charting_library trong public/chart/ dùng chữ ký CŨ:
 *   getBars(symbolInfo, resolution, rangeStartDate, rangeEndDate, onResult, onError, isFirstCall)
 * (xem datafeed-api.d.ts + library bundle gọi getBars(..., o, r, callback, ...)).
 * KHÔNG dùng periodParams object (API mới hơn).
 */

import { reportChartDebug, type ChartDataSource } from "@/lib/chart/debug";
import {
  fetchChartBars,
  listLocalSymbols,
  toTradingViewBars,
  type TradingViewBar,
} from "@/lib/chart/bars";
import { resolveCompanyName } from "@/lib/chart/resolve-symbol";
import { tvError, tvLog, tvWarn } from "@/lib/chart/tv-log";

const SUPPORTED_RESOLUTIONS = ["1", "5", "15", "30", "60", "120", "240", "D", "W", "M"];

export function createCustomDatafeed() {
  tvLog("createCustomDatafeed", { api: "legacy-getBars(from,to,callback)", cache: "session" });

  /** Tránh resolveSymbol lặp cho cùng mã. */
  const resolvedSymbols = new Set<string>();

  return {
    onReady(callback: (config: unknown) => void) {
      tvLog("onReady");
      setTimeout(() => {
        callback({
          supported_resolutions: SUPPORTED_RESOLUTIONS,
          supports_group_request: false,
          supports_marks: false,
          supports_search: true,
          supports_timescale_marks: false,
        });
      }, 0);
    },

    searchSymbols(
      userInput: string,
      _exchange: string,
      _symbolType: string,
      onResult: (results: unknown[]) => void,
    ) {
      const q = userInput.toUpperCase();
      const results = listLocalSymbols()
        .filter((s) => s.includes(q))
        .map((s) => ({
          symbol: s,
          full_name: s,
          description: s,
          exchange: "HOSE",
          type: "stock",
        }));
      tvLog("searchSymbols", { q, count: results.length });
      onResult(results);
    },

    resolveSymbol(
      symbolName: string,
      onResolve: (info: unknown) => void,
      _onError: (reason: string) => void,
    ) {
      const sym = symbolName.toUpperCase();
      if (!resolvedSymbols.has(sym)) {
        tvLog("resolveSymbol", { symbolName: sym });
        resolvedSymbols.add(sym);
        void resolveCompanyName(sym);
      }

      onResolve({
        name: sym,
        full_name: sym,
        ticker: sym,
        description: sym,
        type: "stock",
        session: "0900-1500",
        timezone: "Asia/Bangkok",
        exchange: "HOSE",
        listed_exchange: "HOSE",
        minmov: 1,
        pricescale: 100,
        has_intraday: true,
        has_daily: true,
        has_weekly_and_monthly: true,
        supported_resolutions: SUPPORTED_RESOLUTIONS,
        volume_precision: 0,
        data_status: "streaming",
      });
    },

    /** Giới hạn TV chỉ xin ~5 năm — khớp cache, tránh request range lặp. */
    calculateHistoryDepth(
      _resolution: string,
      _resolutionBack: string,
      _intervalBack: number,
    ) {
      return { resolutionBack: "D" as const, intervalBack: 365 * 5 };
    },

    /**
     * Chữ ký khớp datafeed-api.d.ts (charting_library cũ trong repo).
     */
    async getBars(
      symbolInfo: { name: string },
      resolution: string,
      rangeStartDate: number,
      rangeEndDate: number,
      onResult: (bars: TradingViewBar[], meta: { noData: boolean; nextTime?: number }) => void,
      onError: (reason: string) => void,
      isFirstCall: boolean,
    ) {
      const symbol = symbolInfo.name.toUpperCase();
      const from = rangeStartDate;
      const to = rangeEndDate;

      if (typeof onResult !== "function") {
        const msg =
          "getBars: onResult không phải function — có thể datafeed dùng sai chữ ký API (periodParams vs from/to riêng)";
        tvError("getBars signature", msg, {
          arg3: rangeStartDate,
          arg4: rangeEndDate,
          arg5type: typeof onResult,
        });
        if (typeof onError === "function") onError(msg);
        return;
      }

      try {
        const result = await fetchChartBars(symbol, resolution, from, to);
        const tvBars = toTradingViewBars(result.bars);
        const fromCache = result.detail.includes("cache");

        if (!fromCache) {
          tvLog("getBars API fetch (once per symbol)", {
            symbol,
            resolution,
            tvCount: tvBars.length,
            detail: result.detail,
          });
        }

        reportChartDebug({
          symbol,
          resolution,
          fromSec: from,
          toSec: to,
          source: result.source,
          barCount: tvBars.length,
          noData: tvBars.length === 0,
          detail: `[TV] ${result.detail}${isFirstCall ? " · firstCall" : ""}`,
          error: result.error ?? null,
          bars: result.bars,
        });

        if (result.source === "error" && result.error) {
          tvWarn("getBars error source", { error: result.error });
          onError(result.error);
          return;
        }

        if (tvBars.length === 0) {
          tvWarn("getBars noData", { symbol, from, to });
        }

        onResult(tvBars, { noData: tvBars.length === 0 });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        tvError("getBars exception", e, { symbol, from, to });
        reportChartDebug({
          symbol,
          resolution,
          fromSec: from,
          toSec: to,
          source: "error" as ChartDataSource,
          barCount: 0,
          noData: true,
          detail: "getBars exception",
          error: msg,
          bars: [],
        });
        onError(msg);
      }
    },

    subscribeBars() {
      tvLog("subscribeBars (no-op)");
    },
    unsubscribeBars() {
      tvLog("unsubscribeBars (no-op)");
    },
  };
}
