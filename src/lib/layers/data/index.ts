import type { MarketTick, Position, SavedNewsLink } from "@/lib/layers/shared/types";

const MOCK_SYMBOLS = ["VNM", "FPT", "VCB", "HPG", "MWG"] as const;

export function seedPrices(): Record<string, number> {
  return Object.fromEntries(MOCK_SYMBOLS.map((s) => [s, 50 + Math.random() * 80]));
}

export function nextTick(
  symbol: string,
  prevPrice: number,
): Omit<MarketTick, "ts"> {
  const drift = (Math.random() - 0.48) * 1.6;
  const price = Math.max(5, +(prevPrice * (1 + drift / 100)).toFixed(2));
  const changePct = +(((price - prevPrice) / prevPrice) * 100).toFixed(2);
  const volume = Math.floor(5e5 + Math.random() * 2e6);
  return { symbol, price, changePct, volume };
}

export function portfolioPnL(positions: Position[], prices: Record<string, number>) {
  let invested = 0;
  let market = 0;
  for (const p of positions) {
    const px = prices[p.symbol] ?? p.avgCost;
    invested += p.avgCost * p.qty;
    market += px * p.qty;
  }
  const pnlPct = invested > 0 ? ((market - invested) / invested) * 100 : 0;
  return { invested, market, pnlPct };
}

export function concentrationRisk(positions: Position[], prices: Record<string, number>) {
  const weights: Record<string, number> = {};
  let total = 0;
  for (const p of positions) {
    const px = prices[p.symbol] ?? p.avgCost;
    const v = px * p.qty;
    weights[p.symbol] = (weights[p.symbol] ?? 0) + v;
    total += v;
  }
  const entries = Object.entries(weights).map(([sym, v]) => ({
    symbol: sym,
    pct: total > 0 ? (v / total) * 100 : 0,
  }));
  const max = entries.reduce((a, b) => (a.pct >= b.pct ? a : b), {
    symbol: "",
    pct: 0,
  });
  return { weights: entries, maxSymbol: max.symbol, maxPct: max.pct };
}

export function fakeNewsLinks(seedCount = 2): SavedNewsLink[] {
  const templates: Pick<SavedNewsLink, "title" | "url" | "preview">[] = [
    {
      title: "Tóm tắt demo: biến động nhóm tiêu dùng",
      url: "https://example.com/news/1",
      preview: "Đoạn xem trước ngắn: nhóm tiêu dùng biến động trong phiên demo.",
    },
    {
      title: "Demo link: thanh khoản ngân hàng",
      url: "https://example.com/news/2",
      preview: "Preview: dòng tiền & thanh khoản (nội dung mẫu).",
    },
  ];
  return templates.slice(0, seedCount).map((t, i) => ({
    id: `news-${i}-${Date.now()}`,
    ...t,
    ts: Date.now(),
  }));
}
