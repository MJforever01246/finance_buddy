/** Tên công ty cho TradingView resolveSymbol. */

import { isTauriRuntime } from "@/lib/tauri-env";

const CACHE = new Map<string, string>();

export async function resolveCompanyName(symbol: string): Promise<string> {
  const sym = symbol.toUpperCase();
  const cached = CACHE.get(sym);
  if (cached) return cached;

  if (isTauriRuntime()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const row = await invoke<{ stockName?: string } | null>("db_get_stock_by_symbol", {
        symbol: sym,
      });
      const name = row?.stockName?.trim();
      if (name) {
        CACHE.set(sym, name);
        return name;
      }
    } catch {
      /* fallback */
    }
  }

  CACHE.set(sym, sym);
  return sym;
}
