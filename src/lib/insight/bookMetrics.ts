import { concentrationRisk, portfolioPnL } from "@/lib/layers/data";
import type { Insight, Position } from "@/lib/layers/types";
import { computeRiskScore } from "@/lib/risk/report";
import type { DemoBook } from "./demoBooks";
import { findDemoBook } from "./demoBooks";

export function riskScore(
  pnlPct: number,
  maxPct: number,
  drawdownPct = 0,
): number {
  return computeRiskScore(pnlPct, maxPct, drawdownPct);
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
  peakEquity?: number,
) {
  const positions = bookPositions(book, reduxPositions);
  const prices = pricesForBook(book, basePrices);
  const { market, pnlPct } = portfolioPnL(positions, prices);
  const { maxSymbol, maxPct, weights } = concentrationRisk(positions, prices);
  const peak = Math.max(peakEquity ?? market, market);
  const drawdownPct =
    peak > 0 ? Math.max(0, ((peak - market) / peak) * 100) : 0;
  return {
    positions,
    prices,
    market,
    pnlPct,
    maxSymbol,
    maxPct,
    weights,
    peakEquity: peak,
    drawdownPct,
    risk: riskScore(pnlPct, maxPct, drawdownPct),
  };
}

export type BookPipelineContext = {
  bookId: string;
  bookLabel: string;
  positions: Position[];
  prices: Record<string, number>;
  rotateSymbols: string[];
};

export function resolveBookContext(
  activeBookId: string,
  reduxPositions: Position[],
  basePrices: Record<string, number>,
): BookPipelineContext {
  const book = findDemoBook(activeBookId);
  const positions = bookPositions(book, reduxPositions);
  const prices = pricesForBook(book, basePrices);
  const rotateSymbols = positions.map((p) => p.symbol);
  return {
    bookId: book.id,
    bookLabel: book.label,
    positions,
    prices,
    rotateSymbols,
  };
}

export function filterInsightsForBook(insights: Insight[], bookId: string): Insight[] {
  return insights.filter((i) => i.bookId === bookId);
}
