/**
 * Frontend helpers to query SQLite via Tauri IPC.
 * Only works inside Tauri desktop app — returns null/error in browser.
 */

export interface MarketIndex {
  id: number;
  exchangeCode: string;
  indexCode: string;
  indexName: string;
}

export interface Stock {
  id: number;
  symbol: string;
  stockName: string;
  enStockName: string;
  orgShortName: string;
  enOrgShortName: string;
  exchangeCode: string;
  otherName: string | null;
  marketCode: string;
  stockType: string;
}

type DbResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "not_tauri" | "invoke_failed"; detail?: string };

async function isTauri(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const w = window as unknown as {
    __TAURI_INTERNALS__?: unknown;
    __TAURI__?: unknown;
  };
  return !!(w.__TAURI_INTERNALS__ || w.__TAURI__);
}

async function invokeDb<T>(cmd: string, args?: Record<string, unknown>): Promise<DbResult<T>> {
  if (!(await isTauri())) {
    return { ok: false, reason: "not_tauri" };
  }
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const data = await invoke<T>(cmd, args);
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      reason: "invoke_failed",
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

export function getMarketIndices(): Promise<DbResult<MarketIndex[]>> {
  return invokeDb<MarketIndex[]>("db_get_market_indices");
}

export function getStocks(params?: {
  exchange?: string;
  stockType?: string;
  search?: string;
}): Promise<DbResult<Stock[]>> {
  return invokeDb<Stock[]>("db_get_stocks", {
    exchange: params?.exchange ?? null,
    stockType: params?.stockType ?? null,
    search: params?.search ?? null,
  });
}

export function getStockBySymbol(symbol: string): Promise<DbResult<Stock | null>> {
  return invokeDb<Stock | null>("db_get_stock_by_symbol", { symbol });
}

export function countStocks(): Promise<DbResult<number>> {
  return invokeDb<number>("db_count_stocks");
}
