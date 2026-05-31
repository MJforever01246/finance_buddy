import { loadChartBarsFull } from "@/lib/chart/bars";

/** Lấy giá đóng cửa gần nhất từ OHLCV cache (web hoặc khi VPS thiếu mã). */
export async function fetchLastClosePrices(
  symbols: string[],
  concurrency = 4,
): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  const uniq = [...new Set(symbols.map((s) => s.toUpperCase()))];

  for (let i = 0; i < uniq.length; i += concurrency) {
    const batch = uniq.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(async (sym) => {
        const r = await loadChartBarsFull(sym, "D");
        const last = r.bars.at(-1);
        return last ? ([sym, last.close] as const) : null;
      }),
    );
    for (const row of results) {
      if (row) out[row[0]] = row[1];
    }
  }
  return out;
}
