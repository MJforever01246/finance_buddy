import type {
  CommDelivery,
  Insight,
  MarketTick,
  PipelineLogEntry,
  Position,
} from "@/lib/layers/shared/types";
import {
  concentrationRisk,
  fakeNewsLinks,
  nextTick,
  portfolioPnL,
  seedPrices,
} from "@/lib/layers/data";
import { evaluateTickAgainstPortfolio } from "@/lib/layers/intelligence";
import { insightToDeliveries } from "@/lib/layers/communication";

function runDownstreamPipeline(
  tick: MarketTick,
  positions: Position[],
  prices: Record<string, number>,
): {
  insights: Insight[];
  deliveries: CommDelivery[];
  logs: PipelineLogEntry[];
} {
  const insights = evaluateTickAgainstPortfolio(tick, positions, prices);
  const deliveries: CommDelivery[] = [];
  for (const ins of insights) {
    deliveries.push(...insightToDeliveries(ins));
  }
  const logs: PipelineLogEntry[] = [];
  for (const ins of insights) {
    logs.push({
      layer: "intelligence",
      kind: "insight.generated",
      message: ins.title,
      ts: ins.ts,
    });
  }
  for (const d of deliveries) {
    logs.push({
      layer: "communication",
      kind: `comm.${d.target}`,
      message: d.title,
      ts: d.ts,
    });
  }
  return { insights, deliveries, logs };
}

export function pushDemoTick(input: {
  prices: Record<string, number>;
  positions: Position[];
  rotateIndex: number;
}): {
  rotateIndex: number;
  tick: MarketTick;
  prices: Record<string, number>;
  insights: Insight[];
  deliveries: CommDelivery[];
  logs: PipelineLogEntry[];
} {
  const symbols = Object.keys(input.prices);
  const logs: PipelineLogEntry[] = [];
  if (!symbols.length) {
    return {
      rotateIndex: input.rotateIndex,
      tick: {
        symbol: "?",
        price: 0,
        changePct: 0,
        volume: 0,
        ts: Date.now(),
      },
      prices: input.prices,
      insights: [],
      deliveries: [],
      logs,
    };
  }

  const idx = input.rotateIndex % symbols.length;
  const symbol = symbols[idx];
  const prev = input.prices[symbol] ?? 50;
  const raw = nextTick(symbol, prev);
  const tick: MarketTick = { ...raw, ts: Date.now() };
  const prices = { ...input.prices, [symbol]: tick.price };

  logs.push({
    layer: "data",
    kind: "market.tick",
    message: `${tick.symbol} ${tick.price} (${tick.changePct >= 0 ? "+" : ""}${tick.changePct}%)`,
    ts: tick.ts,
  });

  const downstream = runDownstreamPipeline(tick, input.positions, prices);
  logs.push(...downstream.logs);

  return {
    rotateIndex: input.rotateIndex + 1,
    tick,
    prices,
    insights: downstream.insights,
    deliveries: downstream.deliveries,
    logs,
  };
}

/** Tick từ Node WebSocket — cùng downstream Intelligence → Communication với `pushDemoTick`. */
export function ingestExternalTick(input: {
  symbol: string;
  price: number;
  volume?: number;
  prices: Record<string, number>;
  positions: Position[];
}): {
  tick: MarketTick;
  prices: Record<string, number>;
  insights: Insight[];
  deliveries: CommDelivery[];
  logs: PipelineLogEntry[];
} {
  const prevQuote = input.prices[input.symbol];
  const prevPrice = prevQuote !== undefined ? prevQuote : input.price;
  const changePct =
    prevPrice > 0
      ? +(((input.price - prevPrice) / prevPrice) * 100).toFixed(2)
      : 0;
  const tick: MarketTick = {
    symbol: input.symbol,
    price: input.price,
    changePct,
    volume: input.volume ?? 0,
    ts: Date.now(),
  };
  const prices = { ...input.prices, [input.symbol]: input.price };

  const logs: PipelineLogEntry[] = [
    {
      layer: "data",
      kind: "market.tick.ws",
      message: `${tick.symbol} ${tick.price} (ws, Δ${tick.changePct >= 0 ? "+" : ""}${tick.changePct}%)`,
      ts: tick.ts,
    },
  ];

  const downstream = runDownstreamPipeline(tick, input.positions, prices);
  logs.push(...downstream.logs);

  return {
    tick,
    prices,
    insights: downstream.insights,
    deliveries: downstream.deliveries,
    logs,
  };
}

export function metricsSnapshot(positions: Position[], prices: Record<string, number>) {
  return {
    pnl: portfolioPnL(positions, prices),
    concentration: concentrationRisk(positions, prices),
  };
}

export { seedPrices };
export { fakeNewsLinks } from "@/lib/layers/data";
