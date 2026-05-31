import { concentrationRisk, portfolioPnL } from "@/lib/layers/data";
import type { Position } from "@/lib/layers/types";
import { avgPairwiseCorrelation } from "./correlation";
import { drawdownFromPeak, isDrawdownBreached } from "./drawdown";
import {
  DEFAULT_RISK_LIMITS,
  type PortfolioRiskReport,
  type RebalanceHint,
  type RiskAlert,
  type RiskLimits,
} from "./types";
import {
  closesToDailyReturnsPct,
  historicalVar,
  parametricVar,
  type VarPosition,
} from "./var";

export function computeRiskScore(
  pnlPct: number,
  maxPct: number,
  drawdownPct: number,
  limits: RiskLimits = DEFAULT_RISK_LIMITS,
): number {
  let s = 80;
  if (maxPct >= limits.maxConcentrationPct) s -= 16;
  if (drawdownPct >= limits.maxDrawdownPct * 0.5) s -= 10;
  if (drawdownPct >= limits.maxDrawdownPct) s -= 15;
  if (pnlPct <= -limits.maxDailyLossPct) s -= 20;
  else if (pnlPct <= -2) s -= 8;
  return Math.max(10, Math.min(98, s));
}

function rebalanceHints(
  weights: { symbol: string; pct: number }[],
  market: number,
  targetMaxPct: number,
): RebalanceHint[] {
  const hints: RebalanceHint[] = [];
  for (const w of weights) {
    if (w.pct <= targetMaxPct) continue;
    const targetPct = targetMaxPct;
    const trimValue = market * ((w.pct - targetPct) / 100);
    hints.push({
      symbol: w.symbol,
      currentPct: w.pct,
      targetPct,
      trimValue: Math.max(0, trimValue),
    });
  }
  return hints.sort((a, b) => b.currentPct - a.currentPct);
}

export function buildPortfolioRiskReport(input: {
  positions: Position[];
  prices: Record<string, number>;
  peakEquity: number;
  returnsBySymbol?: Record<string, number[]>;
  limits?: RiskLimits;
}): PortfolioRiskReport {
  const limits = input.limits ?? DEFAULT_RISK_LIMITS;
  const { market, invested, pnlPct } = portfolioPnL(input.positions, input.prices);
  const { maxSymbol, maxPct, weights } = concentrationRisk(
    input.positions,
    input.prices,
  );
  const peakEquity = Math.max(input.peakEquity, market);
  const drawdownPct = drawdownFromPeak(peakEquity, market);
  const drawdownBreached = isDrawdownBreached(
    peakEquity,
    market,
    limits.maxDrawdownPct,
  );

  const varPositions: VarPosition[] = input.positions.map((p) => ({
    symbol: p.symbol,
    quantity: p.qty,
    currentPrice: input.prices[p.symbol] ?? p.avgCost,
  }));

  let var95_1d: number | null = null;
  let var99_1d: number | null = null;
  let var95_1dPct: number | null = null;
  let cvar95: number | null = null;
  let componentVar: Record<string, number> = {};
  let varSource: PortfolioRiskReport["varSource"] = "none";

  if (input.returnsBySymbol && Object.keys(input.returnsBySymbol).length) {
    const hist = historicalVar(varPositions, input.returnsBySymbol);
    const para = parametricVar(varPositions, input.returnsBySymbol);
    const picked = hist ?? para;
    if (picked) {
      var95_1d = picked.var95_1d;
      var99_1d = picked.var99_1d;
      var95_1dPct = picked.var95_1dPct;
      cvar95 = picked.cvar95;
      componentVar = picked.componentVar;
      varSource = hist ? "historical" : "parametric";
    }
  }

  const returnSeries = input.returnsBySymbol
    ? Object.values(input.returnsBySymbol)
    : [];
  const avgCorrelation =
    returnSeries.length >= 2 ? avgPairwiseCorrelation(returnSeries) : null;

  const alerts: RiskAlert[] = [];

  if (drawdownBreached) {
    alerts.push({
      code: "drawdown",
      severity: "risk",
      title: "Drawdown vượt ngưỡng",
      detail: `Từ đỉnh ${drawdownPct.toFixed(1)}% > ${limits.maxDrawdownPct}% — tạm dừng mở vị thế mới (rust-finance gate).`,
    });
  } else if (drawdownPct >= limits.maxDrawdownPct * 0.6) {
    alerts.push({
      code: "drawdown",
      severity: "warn",
      title: "Drawdown cao",
      detail: `Drawdown ${drawdownPct.toFixed(1)}% — theo dõi sát.`,
    });
  }

  if (maxPct >= limits.maxConcentrationPct) {
    alerts.push({
      code: "concentration",
      severity: maxPct >= 45 ? "risk" : "warn",
      title: "Tập trung danh mục",
      detail: `${maxSymbol} chiếm ~${maxPct.toFixed(0)}% (ngưỡng ${limits.maxConcentrationPct}%).`,
    });
  }

  if (var95_1dPct != null && var95_1dPct > limits.maxDailyVarPct) {
    alerts.push({
      code: "var",
      severity: "warn",
      title: "VaR 95% vượt ngưỡng",
      detail: `VaR 1 ngày ~${var95_1dPct.toFixed(2)}% NAV > ${limits.maxDailyVarPct}%.`,
    });
  }

  if (avgCorrelation != null && avgCorrelation > 0.75) {
    alerts.push({
      code: "correlation",
      severity: "warn",
      title: "Tương quan cao",
      detail: `TB |ρ| giữa các mã ~${(avgCorrelation * 100).toFixed(0)}% — rủi ro hệ thống.`,
    });
  }

  if (pnlPct <= -limits.maxDailyLossPct) {
    alerts.push({
      code: "daily_loss",
      severity: "risk",
      title: "Daily loss limit",
      detail: `P/L ${pnlPct.toFixed(2)}% ≤ −${limits.maxDailyLossPct}% (phiên demo).`,
    });
  }

  const rebalanceHintsList = rebalanceHints(weights, market, limits.targetMaxWeightPct);
  const riskScore = computeRiskScore(pnlPct, maxPct, drawdownPct, limits);

  let status: PortfolioRiskReport["status"] = "ok";
  if (alerts.some((a) => a.severity === "risk") || drawdownBreached) status = "halt";
  else if (alerts.some((a) => a.severity === "warn")) status = "warn";

  return {
    market,
    invested,
    pnlPct,
    peakEquity,
    drawdownPct,
    drawdownBreached,
    var95_1d,
    var99_1d,
    var95_1dPct,
    cvar95,
    avgCorrelation,
    riskScore,
    status,
    alerts,
    rebalanceHints: rebalanceHintsList,
    componentVar,
    varSource,
  };
}

export { closesToDailyReturnsPct };
