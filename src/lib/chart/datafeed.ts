/**
 * Custom TradingView Datafeed — wrapper quanh fetchChartBars (shared OHLCV).
 */

import { reportChartDebug, type ChartDataSource } from "@/lib/chart/debug";
import {
  fetchChartBars,
  listLocalSymbols,
  type ChartBar,
} from "@/lib/chart/bars";

const SUPPORTED_RESOLUTIONS = ["1", "5", "15", "30", "60", "120", "240", "D", "W", "M"];

export function createCustomDatafeed() {
  return {
    onReady(callback: (config: unknown) => void) {
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
      onResult(
        listLocalSymbols()
          .filter((s) => s.includes(q))
          .map((s) => ({
            symbol: s,
            full_name: s,
            description: s,
            exchange: "HOSE",
            type: "stock",
          })),
      );
    },

    resolveSymbol(
      symbolName: string,
      onResolve: (info: unknown) => void,
      _onError: (reason: string) => void,
    ) {
      setTimeout(() => {
        const sym = symbolName.toUpperCase();
        onResolve({
          name: sym,
          full_name: sym,
          description: sym,
          type: "stock",
          session: "0900-1500",
          timezone: "Asia/Bangkok",
          exchange: "HOSE",
          minmov: 1,
          pricescale: 100,
          has_intraday: true,
          has_daily: true,
          has_weekly_and_monthly: true,
          supported_resolutions: SUPPORTED_RESOLUTIONS,
          volume_precision: 0,
          data_status: "streaming",
        });
      }, 0);
    },

    async getBars(
      symbolInfo: { name: string },
      resolution: string,
      periodParams: { from: number; to: number; firstDataRequest: boolean },
      onResult: (bars: ChartBar[], meta: { noData: boolean }) => void,
      onError: (reason: string) => void,
    ) {
      const symbol = symbolInfo.name.toUpperCase();
      const { from, to, firstDataRequest } = periodParams;

      try {
        const result = await fetchChartBars(symbol, resolution, from, to);
        reportChartDebug({
          symbol,
          resolution,
          fromSec: from,
          toSec: to,
          source: result.source,
          barCount: result.bars.length,
          noData: result.bars.length === 0,
          detail: `${result.detail}${firstDataRequest ? " · firstRequest" : ""}`,
          error: result.error ?? null,
          bars: result.bars,
        });
        if (result.source === "error" && result.error) {
          onError(result.error);
          return;
        }
        onResult(result.bars, { noData: result.bars.length === 0 });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
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

    subscribeBars() {},
    unsubscribeBars() {},
  };
}
