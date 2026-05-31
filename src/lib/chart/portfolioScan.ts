/**
 * Quét chỉ báo kỹ thuật (RSI/MA) cho toàn danh mục — trọng số theo giá trị thị trường.
 * Heuristic nội bộ, không phải khuyến nghị đầu tư.
 */

import { loadChartBarsFull } from "./bars";
import {
  analyzeBars,
  type AnalysisSignal,
  type BarAnalysis,
} from "./indicators";
import type { Position } from "@/lib/layers/shared/types";

export type PortfolioScanRow = BarAnalysis & {
  weightPct: number;
  marketValue: number;
  score: number;
};

export type PortfolioScanResult = {
  overall: AnalysisSignal;
  overallScore: number;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  scanned: number;
  failed: string[];
  rows: PortfolioScanRow[];
  summary: string;
};

function signalScore(signal: AnalysisSignal): number {
  if (signal === "bullish") return 1;
  if (signal === "bearish") return -1;
  return 0;
}

function overallFromScore(score: number): AnalysisSignal {
  if (score >= 0.35) return "bullish";
  if (score <= -0.35) return "bearish";
  return "neutral";
}

function overallLabel(signal: AnalysisSignal): string {
  if (signal === "bullish") return "Tích cực";
  if (signal === "bearish") return "Tiêu cực";
  return "Trung lập";
}

export async function scanPortfolioIndicators(input: {
  positions: Position[];
  prices: Record<string, number>;
  resolution?: string;
  concurrency?: number;
}): Promise<PortfolioScanResult> {
  const resolution = input.resolution ?? "D";
  const positions = input.positions.filter((p) => p.qty > 0);
  if (!positions.length) {
    return {
      overall: "neutral",
      overallScore: 0,
      bullishCount: 0,
      bearishCount: 0,
      neutralCount: 0,
      scanned: 0,
      failed: [],
      rows: [],
      summary: "Danh mục trống",
    };
  }

  const marketBySym = new Map<string, number>();
  let totalMarket = 0;
  for (const p of positions) {
    const px = input.prices[p.symbol] ?? p.avgCost;
    const mv = px * p.qty;
    marketBySym.set(p.symbol, mv);
    totalMarket += mv;
  }

  const symbols = [...new Set(positions.map((p) => p.symbol))];
  const failed: string[] = [];
  const analyses: BarAnalysis[] = [];
  const limit = input.concurrency ?? 4;

  for (let i = 0; i < symbols.length; i += limit) {
    const batch = symbols.slice(i, i + limit);
    const results = await Promise.all(
      batch.map(async (sym) => {
        const result = await loadChartBarsFull(sym, resolution);
        if (!result.bars.length) {
          failed.push(sym);
          return null;
        }
        return analyzeBars(sym, result.bars);
      }),
    );
    for (const r of results) {
      if (r) analyses.push(r);
    }
  }

  const rows: PortfolioScanRow[] = analyses.map((a) => {
    const marketValue = marketBySym.get(a.symbol) ?? 0;
    const weightPct =
      totalMarket > 0 ? +((marketValue / totalMarket) * 100).toFixed(1) : 0;
    const score = signalScore(a.signal);
    return { ...a, weightPct, marketValue, score };
  });

  let weightedScore = 0;
  if (totalMarket > 0) {
    for (const row of rows) {
      weightedScore += row.score * (row.marketValue / totalMarket);
    }
  } else if (rows.length) {
    weightedScore = rows.reduce((s, r) => s + r.score, 0) / rows.length;
  }

  const bullishCount = rows.filter((r) => r.signal === "bullish").length;
  const bearishCount = rows.filter((r) => r.signal === "bearish").length;
  const neutralCount = rows.filter((r) => r.signal === "neutral").length;
  const overall = overallFromScore(weightedScore);

  const parts = [
    `${overallLabel(overall)} (điểm ${weightedScore >= 0 ? "+" : ""}${weightedScore.toFixed(2)})`,
    `${bullishCount} tích cực · ${neutralCount} trung lập · ${bearishCount} tiêu cực`,
  ];
  if (failed.length) parts.push(`${failed.length} mã thiếu OHLCV`);

  return {
    overall,
    overallScore: +weightedScore.toFixed(3),
    bullishCount,
    bearishCount,
    neutralCount,
    scanned: rows.length,
    failed,
    rows: rows.sort((a, b) => b.weightPct - a.weightPct),
    summary: parts.join(" · "),
  };
}
