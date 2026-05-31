import type { Insight, MarketTick, Position } from "@/lib/layers/shared/types";
import { concentrationRisk, portfolioPnL } from "@/lib/layers/data";

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

type BookMeta = {
  bookId: string;
  bookLabel?: string;
};

function withBook(ins: Omit<Insight, "id">, meta: BookMeta): Insight {
  return { ...ins, id: uid("ins"), bookId: meta.bookId };
}

/** Kiểm tra tĩnh khi đổi sổ — drawdown / tập trung (không cần tick mới). */
export function evaluatePortfolioSnapshot(
  positions: Position[],
  prices: Record<string, number>,
  meta: BookMeta,
): Insight[] {
  const out: Insight[] = [];
  if (!positions.length) return out;

  const { maxPct, maxSymbol } = concentrationRisk(positions, prices);
  if (maxPct >= 38) {
    out.push(
      withBook(
        {
          title: `Tập trung danh mục · ${maxSymbol} ~${maxPct.toFixed(0)}%`,
          detail: `${meta.bookLabel ?? meta.bookId}: ${maxSymbol} chiếm ~${maxPct.toFixed(0)}% giá trị — theo dõi rủi ro tập trung.`,
          severity: maxPct >= 45 ? "risk" : "warn",
          relatedSymbols: [maxSymbol],
          ts: Date.now(),
        },
        meta,
      ),
    );
  }

  const { pnlPct } = portfolioPnL(positions, prices);
  if (pnlPct <= -5) {
    out.push(
      withBook(
        {
          title: `Drawdown danh mục ~${pnlPct.toFixed(2)}%`,
          detail: `${meta.bookLabel ?? meta.bookId}: P/L tổng dưới ngưỡng −5% — cân nhắc rebalance / cảnh báo rủi ro.`,
          severity: "risk",
          relatedSymbols: positions.map((p) => p.symbol),
          ts: Date.now(),
        },
        meta,
      ),
    );
  }

  return out;
}

export function evaluateTickAgainstPortfolio(
  tick: MarketTick,
  positions: Position[],
  prices: Record<string, number>,
  meta: BookMeta,
): Insight[] {
  const out: Insight[] = [];
  const pos = positions.find((p) => p.symbol === tick.symbol);
  const { maxPct, maxSymbol } = concentrationRisk(positions, prices);
  const bookTag = meta.bookLabel ?? meta.bookId;

  if (pos && Math.abs(tick.changePct) >= 2) {
    const { market } = portfolioPnL(positions, prices);
    const posVal = (prices[tick.symbol] ?? tick.price) * pos.qty;
    const weightPct = market > 0 ? (posVal / market) * 100 : 0;
    const contribPct = market > 0 ? (tick.changePct * posVal) / market : 0;

    out.push(
      withBook(
        {
          title: `Ảnh hưởng ~${contribPct >= 0 ? "+" : ""}${contribPct.toFixed(2)}% (trọng số ~${weightPct.toFixed(0)}%)`,
          detail: `${bookTag}: ${tick.symbol} ${tick.changePct >= 0 ? "+" : ""}${tick.changePct}% — |Δ%| ≥ 2 và mã trong sổ.`,
          severity: Math.abs(tick.changePct) >= 4 ? "warn" : "info",
          relatedSymbols: [tick.symbol],
          ts: Date.now(),
          sourceTick: tick,
        },
        meta,
      ),
    );
  }

  if (maxPct >= 38 && maxSymbol === tick.symbol && Math.abs(tick.changePct) >= 1.5) {
    out.push(
      withBook(
        {
          title: "Tập trung + biến động mạnh",
          detail: `${bookTag}: ${maxSymbol} ~${maxPct.toFixed(0)}% danh mục — biến động làm tăng rủi ro tập trung.`,
          severity: "risk",
          relatedSymbols: [maxSymbol],
          ts: Date.now(),
          sourceTick: tick,
        },
        meta,
      ),
    );
  }

  const { pnlPct } = portfolioPnL(positions, prices);
  if (pnlPct <= -5 && positions.length) {
    out.push(
      withBook(
        {
          title: "Drawdown sau tick",
          detail: `${bookTag}: P/L tổng ~${pnlPct.toFixed(2)}% — ngưỡng rủi ro drawdown.`,
          severity: "risk",
          relatedSymbols: positions.map((p) => p.symbol),
          ts: Date.now(),
          sourceTick: tick,
        },
        meta,
      ),
    );
  }

  return out;
}

export function summarizeInsightForAiStub(insight: Insight): string {
  const book = insight.bookId ? `[${insight.bookId}] ` : "";
  return `[AI stub] ${book}${insight.title} — ${insight.detail}`;
}
