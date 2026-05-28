/**
 * Custom TradingView Datafeed — đọc dữ liệu local (JSON mẫu) hoặc qua Tauri IPC (VPS API).
 * Implements TradingView JS API: onReady, resolveSymbol, getBars, subscribeBars, unsubscribeBars.
 */

import sampleData from "@/../data_config/tes_data_feed.json";
import { isTauriRuntime } from "@/lib/tauri-env";

interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface OhlcvRaw {
  t: number[];
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  v: number[];
}

interface TradingViewHistoryResponse {
  s: string;
  t: number[];
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  v: number[];
}

const SUPPORTED_RESOLUTIONS = ["1", "5", "15", "30", "60", "120", "240", "D", "W", "M"];

function normalizeVpsResolution(resolution: string): string {
  const r = resolution.trim().toUpperCase();
  if (r === "D") return "1D";
  if (r === "W") return "1W";
  if (r === "M") return "1M";
  return r;
}

function parseOhlcv(raw: OhlcvRaw): Bar[] {
  return raw.t.map((t, i) => ({
    time: t * 1000,
    open: raw.o[i],
    high: raw.h[i],
    low: raw.l[i],
    close: raw.c[i],
    volume: raw.v[i],
  }));
}

async function fetchFromDb(
  symbol: string,
  resolution: string,
  from: number,
  to: number,
): Promise<Bar[] | null> {
  if (typeof window === "undefined") return null;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    // TradingView sometimes sends incomplete range on initial load.
    // Force a sane fallback range so we still query Rust/SQLite.
    const nowSec = Math.floor(Date.now() / 1000);
    const safeFrom = Number.isFinite(from) ? Math.trunc(from) : nowSec - 86400 * 365 * 3;
    const safeTo = Number.isFinite(to) ? Math.trunc(to) : nowSec;
    const data = await invoke<TradingViewHistoryResponse>("db_get_tradingview_history", {
      symbol,
      resolution,
      fromSec: safeFrom,
      toSec: safeTo,
    });
    if (data.s !== "no_data" && data.t?.length) {
      return data.t.map((t: number, i: number) => ({
        time: t * 1000,
        open: data.o[i],
        high: data.h[i],
        low: data.l[i],
        close: data.c[i],
        volume: data.v[i],
      }));
    }

    // Fallback to live VPS API if local crawled data is empty.
    const raw = await invoke<string>("vps_get_tradingview_history", {
      symbol,
      resolution: normalizeVpsResolution(resolution),
      fromSec: safeFrom,
      toSec: safeTo,
      countback: 500,
    });
    const live = JSON.parse(raw) as TradingViewHistoryResponse;
    if (live.s === "no_data" || !live.t || !live.t.length) return [];
    return live.t.map((t: number, i: number) => ({
      time: t * 1000,
      open: live.o[i],
      high: live.h[i],
      low: live.l[i],
      close: live.c[i],
      volume: live.v[i],
    }));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e ?? "");
    // Browser mode: no Tauri bridge, allow fallback to local sample data.
    const notTauri =
      message.includes("__TAURI_INTERNALS__") ||
      message.includes("window.__TAURI__") ||
      message.includes("not available") ||
      message.includes("not initialized");
    if (notTauri || !isTauriRuntime()) return null;
    // In Tauri mode, keep no-data behavior rather than mixing with demo data.
    return [];
  }
}

export function createCustomDatafeed() {
  const localData = sampleData as Record<string, OhlcvRaw>;

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
      const symbols = Object.keys(localData);
      const results = symbols
        .filter((s) => s.includes(q))
        .map((s) => ({
          symbol: s,
          full_name: s,
          description: s,
          exchange: "HOSE",
          type: "stock",
        }));
      onResult(results);
    },

    resolveSymbol(
      symbolName: string,
      onResolve: (info: unknown) => void,
      onError: (reason: string) => void,
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
      onResult: (bars: Bar[], meta: { noData: boolean }) => void,
      onError: (reason: string) => void,
    ) {
      const symbol = symbolInfo.name.toUpperCase();
      const { from, to } = periodParams;

      // Try Tauri IPC first (real VPS data)
      const dbBars = await fetchFromDb(symbol, resolution, from, to);
      if (dbBars !== null) {
        onResult(dbBars, { noData: dbBars.length === 0 });
        return;
      }

      // Fallback: local JSON data
      const raw = localData[symbol];
      if (!raw) {
        onResult([], { noData: true });
        return;
      }

      const allBars = parseOhlcv(raw);
      const fromMs = from * 1000;
      const toMs = to * 1000;
      const filtered = allBars.filter((b) => b.time >= fromMs && b.time <= toMs);
      onResult(filtered, { noData: filtered.length === 0 });
    },

    subscribeBars(
      _symbolInfo: unknown,
      _resolution: string,
      _onTick: (bar: Bar) => void,
      _listenerGuid: string,
      _onResetCacheNeededCallback: () => void,
    ) {
      // No realtime updates in demo mode
    },

    unsubscribeBars(_listenerGuid: string) {
      // No-op
    },
  };
}
