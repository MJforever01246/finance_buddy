import { portfolioPnL } from "@/lib/layers/data";
import type { Position } from "@/lib/layers/shared/types";

export type PositionRow = {
  symbol: string;
  qty: number;
  avgCost: number;
  price: number;
  invested: number;
  market: number;
  pnlAbs: number;
  pnlPct: number;
  weightPct: number;
};

export function positionRows(
  positions: Position[],
  prices: Record<string, number>,
): PositionRow[] {
  const { market: totalMarket } = portfolioPnL(positions, prices);
  return positions.map((p) => {
    const price = prices[p.symbol] ?? p.avgCost;
    const invested = p.avgCost * p.qty;
    const market = price * p.qty;
    const pnlAbs = market - invested;
    const pnlPct = invested > 0 ? (pnlAbs / invested) * 100 : 0;
    const weightPct = totalMarket > 0 ? (market / totalMarket) * 100 : 0;
    return {
      symbol: p.symbol,
      qty: p.qty,
      avgCost: p.avgCost,
      price,
      invested,
      market,
      pnlAbs,
      pnlPct,
      weightPct,
    };
  });
}

export function portfolioTotals(positions: Position[], prices: Record<string, number>) {
  const rows = positionRows(positions, prices);
  const { invested, market, pnlPct } = portfolioPnL(positions, prices);
  const pnlAbs = market - invested;
  return { rows, invested, market, pnlAbs, pnlPct };
}
