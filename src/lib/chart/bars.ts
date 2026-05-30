/**
 * OHLCV bars — dùng chung cho TradingView datafeed và Lightweight Charts.
 * time: Unix milliseconds (nội bộ app).
 */

import sampleData from "@/../data_config/tes_data_feed.json";
import type { ChartDataSource } from "@/lib/chart/debug";
import { isTauriRuntime } from "@/lib/tauri-env";

export type ChartBar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type OhlcvRaw = {
  t: number[];
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  v: number[];
};

export type TradingViewHistoryResponse = {
  s: string;
  t: number[];
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  v: number[];
};

export type FetchBarsResult = {
  bars: ChartBar[];
  source: ChartDataSource;
  detail: string;
  error?: string;
};

const localData = sampleData as Record<string, OhlcvRaw>;

export function listLocalSymbols(): string[] {
  return Object.keys(localData);
}

export function normalizeVpsResolution(resolution: string): string {
  const r = resolution.trim().toUpperCase();
  if (r === "D") return "1D";
  if (r === "W") return "1W";
  if (r === "M") return "1M";
  return r;
}

export function parseOhlcv(raw: OhlcvRaw): ChartBar[] {
  const len = raw.t?.length ?? 0;
  const bars: ChartBar[] = [];
  for (let i = 0; i < len; i++) {
    const o = raw.o[i];
    const h = raw.h[i];
    const l = raw.l[i];
    const c = raw.c[i];
    if (
      o == null ||
      h == null ||
      l == null ||
      c == null ||
      !Number.isFinite(o) ||
      !Number.isFinite(h) ||
      !Number.isFinite(l) ||
      !Number.isFinite(c)
    ) {
      continue;
    }
    bars.push({
      time: raw.t[i]! * 1000,
      open: o,
      high: h,
      low: l,
      close: c,
      volume: raw.v[i] ?? 0,
    });
  }
  return bars;
}

export function historyToBars(data: TradingViewHistoryResponse): ChartBar[] {
  if (data.s === "no_data" || !data.t?.length) return [];
  return data.t.map((t, i) => ({
    time: t * 1000,
    open: data.o[i]!,
    high: data.h[i]!,
    low: data.l[i]!,
    close: data.c[i]!,
    volume: data.v[i] ?? 0,
  }));
}

export function filterBarsByRange(bars: ChartBar[], fromSec: number, toSec: number): ChartBar[] {
  const fromMs = fromSec * 1000;
  const toMs = toSec * 1000;
  return bars.filter((b) => b.time >= fromMs && b.time <= toMs);
}

export function recentBars(bars: ChartBar[], limit = 500): ChartBar[] {
  if (bars.length <= limit) return bars;
  return bars.slice(-limit);
}

async function fetchFromTauri(
  symbol: string,
  resolution: string,
  fromSec: number,
  toSec: number,
): Promise<{ bars: ChartBar[]; source: "sqlite" | "vps" | "none" } | { error: string }> {
  if (typeof window === "undefined") return { error: "no window" };
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const data = await invoke<TradingViewHistoryResponse>("db_get_tradingview_history", {
      symbol,
      resolution,
      fromSec,
      toSec,
    });
    if (data.s !== "no_data" && data.t?.length) {
      return { bars: historyToBars(data), source: "sqlite" };
    }

    const raw = await invoke<string>("vps_get_tradingview_history", {
      symbol,
      resolution: normalizeVpsResolution(resolution),
      fromSec,
      toSec,
      countback: 500,
    });
    const live = JSON.parse(raw) as TradingViewHistoryResponse;
    if (live.s === "no_data" || !live.t?.length) return { bars: [], source: "none" };
    return { bars: historyToBars(live), source: "vps" };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e ?? "");
    const notTauri =
      message.includes("__TAURI_INTERNALS__") ||
      message.includes("window.__TAURI__") ||
      message.includes("not available") ||
      message.includes("not initialized");
    if (notTauri || !isTauriRuntime()) return { error: "not-tauri" };
    return { error: message };
  }
}

/** Lấy bars — cùng nguồn với TradingView datafeed. */
export async function fetchChartBars(
  symbol: string,
  resolution = "D",
  fromSec?: number,
  toSec?: number,
): Promise<FetchBarsResult> {
  const sym = symbol.toUpperCase();
  const nowSec = Math.floor(Date.now() / 1000);
  const from = Number.isFinite(fromSec) ? Math.trunc(fromSec!) : nowSec - 86400 * 365 * 3;
  const to = Number.isFinite(toSec) ? Math.trunc(toSec!) : nowSec;

  const tauriResult = await fetchFromTauri(sym, resolution, from, to);

  if (!("error" in tauriResult)) {
    let bars = tauriResult.bars;
    let source: ChartDataSource = tauriResult.source;
    if (bars.length === 0 && source === "none") {
      return { bars: [], source: "none", detail: "SQLite + VPS đều no_data" };
    }
    if (bars.length === 0) {
      return { bars: [], source, detail: `${source}: 0 bars` };
    }
    const filtered = filterBarsByRange(bars, from, to);
    if (filtered.length === 0) {
      bars = recentBars(bars);
      return {
        bars,
        source,
        detail: `Range không khớp → ${bars.length} nến gần nhất`,
      };
    }
    return { bars: filtered, source, detail: `OK từ ${source}` };
  }

  if (tauriResult.error !== "not-tauri") {
    return { bars: [], source: "error", detail: tauriResult.error, error: tauriResult.error };
  }

  const raw = localData[sym];
  if (!raw) {
    const keys = Object.keys(localData).slice(0, 8).join(", ");
    return {
      bars: [],
      source: "none",
      detail: `Không có "${sym}" trong JSON. Có: ${keys}…`,
    };
  }

  const allBars = parseOhlcv(raw);
  if (allBars.length === 0) {
    return { bars: [], source: "json", detail: "JSON parse ra 0 bar" };
  }

  let bars = filterBarsByRange(allBars, from, to);
  if (bars.length === 0) {
    bars = recentBars(allBars);
    return {
      bars,
      source: "json-fallback-all",
      detail: `JSON fallback ${bars.length}/${allBars.length} nến`,
    };
  }
  return {
    bars,
    source: "json",
    detail: `JSON ${bars.length}/${allBars.length} trong range`,
  };
}

/** Lightweight Charts: time = Unix seconds (UTCTimestamp). */
export function toLightweightCandles(bars: ChartBar[]) {
  return [...bars]
    .sort((a, b) => a.time - b.time)
    .map((b) => ({
      time: Math.floor(b.time / 1000) as import("lightweight-charts").UTCTimestamp,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    }));
}

export function toLightweightVolume(bars: ChartBar[]) {
  return [...bars]
    .sort((a, b) => a.time - b.time)
    .map((b) => ({
      time: Math.floor(b.time / 1000) as import("lightweight-charts").UTCTimestamp,
      value: b.volume,
      color: b.close >= b.open ? "rgba(74, 222, 128, 0.5)" : "rgba(248, 113, 113, 0.5)",
    }));
}
