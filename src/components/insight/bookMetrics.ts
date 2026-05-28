import { concentrationRisk, portfolioPnL } from "@/lib/layers/data";
import type { Position } from "@/lib/layers/types";
import type { DemoBook } from "./demoBooks";

export function riskScore(pnlPct: number, maxPct: number): number {
  let s = 80;
  if (maxPct >= 35) s -= 16;
  if (pnlPct <= -5) s -= 20;
  else if (pnlPct <= -2) s -= 8;
  return Math.max(10, Math.min(98, s));
}

export function pricesForBook(
  book: DemoBook,
  basePrices: Record<string, number>,
): Record<string, number> {
  if (book.id !== "scenario-hpg") return basePrices;
  const px = basePrices.HPG ?? 24;
  return { ...basePrices, HPG: +(px * 0.7).toFixed(2) };
}

export function bookPositions(book: DemoBook, reduxPositions: Position[]): Position[] {
  return book.role === "own" ? reduxPositions : book.positions;
}

export function summarizeBook(
  book: DemoBook,
  reduxPositions: Position[],
  basePrices: Record<string, number>,
) {
  const positions = bookPositions(book, reduxPositions);
  const prices = pricesForBook(book, basePrices);
  const { market, pnlPct } = portfolioPnL(positions, prices);
  const { maxSymbol, maxPct, weights } = concentrationRisk(positions, prices);
  return {
    positions,
    prices,
    market,
    pnlPct,
    maxSymbol,
    maxPct,
    weights,
    risk: riskScore(pnlPct, maxPct),
  };
}
