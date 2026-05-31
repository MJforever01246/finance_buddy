/** Value at Risk — port đơn giản từ rust-finance `var.rs`. */

export type VarPosition = {
  symbol: string;
  quantity: number;
  currentPrice: number;
};

export type VarResult = {
  var95_1d: number;
  var99_1d: number;
  var95_1dPct: number;
  var99_1dPct: number;
  cvar95: number;
  portfolioNotional: number;
  componentVar: Record<string, number>;
};

function stdDev(returns: number[]): number {
  const n = returns.length;
  if (n < 2) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / n;
  const variance =
    returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (n - 1);
  return Math.sqrt(variance);
}

function notional(p: VarPosition): number {
  return Math.abs(p.quantity * p.currentPrice);
}

/** VaR lịch sử — phân phối lợi nhuận danh mục theo ngày. */
export function historicalVar(
  positions: VarPosition[],
  returnsBySymbol: Record<string, number[]>,
  minHistoryDays = 20,
): VarResult | null {
  if (!positions.length) return null;

  const lens = positions.map((p) => returnsBySymbol[p.symbol]?.length ?? 0);
  const nDays = Math.min(...lens);
  if (nDays < minHistoryDays) return null;

  const pnlSeries: number[] = [];
  for (let dayIdx = 0; dayIdx < nDays; dayIdx++) {
    let dayPnl = 0;
    for (const pos of positions) {
      const hist = returnsBySymbol[pos.symbol];
      const ret = hist?.[dayIdx];
      if (ret != null) dayPnl += notional(pos) * (ret / 100);
    }
    pnlSeries.push(dayPnl);
  }

  const sorted = [...pnlSeries].sort((a, b) => a - b);
  const n = sorted.length;
  const idx95 = Math.floor((1 - 0.95) * n);
  const idx99 = Math.floor((1 - 0.99) * n);
  const var95 = Math.max(0, -Math.min(0, sorted[idx95] ?? 0));
  const var99 = Math.max(0, -Math.min(0, sorted[idx99] ?? 0));
  const tail95 = sorted.slice(0, idx95 + 1);
  const cvar95 =
    tail95.length > 0
      ? -tail95.reduce((a, b) => a + b, 0) / tail95.length
      : var95;

  const portfolioNotional = positions.reduce((s, p) => s + notional(p), 0);
  const componentVar: Record<string, number> = {};
  for (const pos of positions) {
    const w = notional(pos) / Math.max(portfolioNotional, 1);
    componentVar[pos.symbol] = var99 * w;
  }

  return {
    var95_1d: var95,
    var99_1d: var99,
    var95_1dPct: (var95 / Math.max(portfolioNotional, 1)) * 100,
    var99_1dPct: (var99 / Math.max(portfolioNotional, 1)) * 100,
    cvar95,
    portfolioNotional,
    componentVar,
  };
}

/** VaR tham số (delta-normal) — giả định tương quan 0 giữa các mã. */
export function parametricVar(
  positions: VarPosition[],
  returnsBySymbol: Record<string, number[]>,
  minHistoryDays = 10,
): VarResult | null {
  if (!positions.length) return null;

  let portfolioVariance = 0;
  const componentVar: Record<string, number> = {};

  for (const pos of positions) {
    const hist = returnsBySymbol[pos.symbol];
    if (!hist || hist.length < minHistoryDays) return null;
    const dailyVol = stdDev(hist);
    const posDollarVol = notional(pos) * (dailyVol / 100);
    portfolioVariance += posDollarVol * posDollarVol;
    componentVar[pos.symbol] = posDollarVol * 2.326;
  }

  const portfolioVol = Math.sqrt(portfolioVariance);
  const var95 = portfolioVol * 1.645;
  const var99 = portfolioVol * 2.326;
  const portfolioNotional = positions.reduce((s, p) => s + notional(p), 0);

  return {
    var95_1d: var95,
    var99_1d: var99,
    var95_1dPct: (var95 / Math.max(portfolioNotional, 1)) * 100,
    var99_1dPct: (var99 / Math.max(portfolioNotional, 1)) * 100,
    cvar95: var95 * 1.2,
    portfolioNotional,
    componentVar,
  };
}

/** Chuỗi giá đóng → % thay đổi ngày. */
export function closesToDailyReturnsPct(closes: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1]!;
    const cur = closes[i]!;
    if (prev > 0) out.push(((cur - prev) / prev) * 100);
  }
  return out;
}
