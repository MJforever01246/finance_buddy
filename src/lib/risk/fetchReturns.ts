import { fetchChartBars } from "@/lib/chart/bars";
import type { Position } from "@/lib/layers/types";
import { closesToDailyReturnsPct } from "./var";

/** Lấy chuỗi % thay đổi ngày từ OHLCV (VPS / SQLite / JSON). */
export async function fetchReturnsBySymbol(
  symbols: string[],
): Promise<Record<string, number[]>> {
  const out: Record<string, number[]> = {};
  await Promise.all(
    symbols.map(async (sym) => {
      const result = await fetchChartBars(sym, "D");
      const closes = result.bars.map((b) => b.close);
      if (closes.length >= 2) {
        out[sym] = closesToDailyReturnsPct(closes);
      }
    }),
  );
  return out;
}

export async function fetchReturnsForPositions(
  positions: Position[],
): Promise<Record<string, number[]>> {
  const symbols = [...new Set(positions.map((p) => p.symbol))];
  return fetchReturnsBySymbol(symbols);
}
