import type { Insight, MarketTick, Position } from "@/lib/layers/shared/types";
import { concentrationRisk, portfolioPnL } from "@/lib/layers/data";

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function evaluateTickAgainstPortfolio(
  tick: MarketTick,
  positions: Position[],
  prices: Record<string, number>,
): Insight[] {
  const out: Insight[] = [];
  const pos = positions.find((p) => p.symbol === tick.symbol);
  const { maxPct, maxSymbol } = concentrationRisk(positions, prices);

  if (pos && Math.abs(tick.changePct) >= 2) {
    const { market } = portfolioPnL(positions, prices);
    const posVal = (prices[tick.symbol] ?? tick.price) * pos.qty;
    const weightPct = market > 0 ? (posVal / market) * 100 : 0;
    const contribPct = market > 0 ? (tick.changePct * posVal) / market : 0;

    out.push({
      id: uid("ins"),
      title: `Ảnh hưởng danh mục ~${contribPct >= 0 ? "+" : ""}${contribPct.toFixed(2)}% (trọng số ~${weightPct.toFixed(0)}%)`,
      detail: `${tick.symbol} ${tick.changePct >= 0 ? "+" : ""}${tick.changePct}% — rule demo: |Δ%| ≥ 2 và mã có trong portfolio.`,
      severity: Math.abs(tick.changePct) >= 4 ? "warn" : "info",
      relatedSymbols: [tick.symbol],
      ts: Date.now(),
      sourceTick: tick,
    });
  }

  if (maxPct >= 38 && maxSymbol === tick.symbol && Math.abs(tick.changePct) >= 1.5) {
    out.push({
      id: uid("ins"),
      title: "Tập trung danh mục (concentration)",
      detail: `${maxSymbol} chiếm ~${maxPct.toFixed(0)}% giá trị demo — biến động mạnh làm tăng rủi ro tập trung.`,
      severity: "risk",
      relatedSymbols: [maxSymbol],
      ts: Date.now(),
      sourceTick: tick,
    });
  }

  const { pnlPct } = portfolioPnL(positions, prices);
  if (pnlPct <= -5 && positions.length) {
    out.push({
      id: uid("ins"),
      title: "Drawdown danh mục (demo)",
      detail: `P/L tổng ~${pnlPct.toFixed(2)}% so với giá vốn giả lập — có thể kích hoạt nhắc rủi ro / rebalance.`,
      severity: "risk",
      relatedSymbols: positions.map((p) => p.symbol),
      ts: Date.now(),
      sourceTick: tick,
    });
  }

  return out;
}

export function summarizeInsightForAiStub(insight: Insight): string {
  return `[AI stub] ${insight.title} — ${insight.detail}`;
}
