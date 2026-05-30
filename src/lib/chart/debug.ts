/** Trạng thái debug datafeed — hiển thị trên UI chart. */

export type ChartDataSource =
  | "sqlite"
  | "vps"
  | "json"
  | "json-fallback-all"
  | "none"
  | "error";

export type ChartDebugSnapshot = {
  at: string;
  symbol: string;
  resolution: string;
  fromSec: number;
  toSec: number;
  source: ChartDataSource;
  barCount: number;
  noData: boolean;
  firstBarTime: string | null;
  lastBarTime: string | null;
  detail: string;
  error: string | null;
};

let snapshot: ChartDebugSnapshot = {
  at: "",
  symbol: "",
  resolution: "",
  fromSec: 0,
  toSec: 0,
  source: "none",
  barCount: 0,
  noData: true,
  firstBarTime: null,
  lastBarTime: null,
  detail: "Chưa gọi getBars",
  error: null,
};

const listeners = new Set<(s: ChartDebugSnapshot) => void>();

export function getChartDebugSnapshot(): ChartDebugSnapshot {
  return snapshot;
}

export function subscribeChartDebug(cb: (s: ChartDebugSnapshot) => void): () => void {
  listeners.add(cb);
  cb(snapshot);
  return () => listeners.delete(cb);
}

function fmtTime(ms: number | undefined): string | null {
  if (ms == null || !Number.isFinite(ms)) return null;
  try {
    return new Date(ms).toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

export function reportChartDebug(
  partial: Omit<ChartDebugSnapshot, "at" | "firstBarTime" | "lastBarTime"> & {
    bars?: { time: number }[];
  },
) {
  const bars = partial.bars;
  const first = bars?.length ? bars[0]!.time : undefined;
  const last = bars?.length ? bars[bars.length - 1]!.time : undefined;

  snapshot = {
    at: new Date().toISOString(),
    symbol: partial.symbol,
    resolution: partial.resolution,
    fromSec: partial.fromSec,
    toSec: partial.toSec,
    source: partial.source,
    barCount: partial.barCount,
    noData: partial.noData,
    firstBarTime: fmtTime(first),
    lastBarTime: fmtTime(last),
    detail: partial.detail,
    error: partial.error ?? null,
  };

  for (const cb of listeners) cb(snapshot);
}
