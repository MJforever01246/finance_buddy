export type LayerId = "data" | "intelligence" | "communication";

export interface MarketTick {
  symbol: string;
  price: number;
  changePct: number;
  volume: number;
  ts: number;
}

export interface Position {
  symbol: string;
  qty: number;
  avgCost: number;
}

export interface SavedNewsLink {
  id: string;
  url: string;
  title: string;
  /** Đoạn xem trước ngắn (paste tay hoặc crawl sau) */
  preview?: string;
  ts: number;
}

export interface Insight {
  id: string;
  title: string;
  detail: string;
  severity: "info" | "warn" | "risk";
  relatedSymbols: string[];
  ts: number;
  sourceTick?: MarketTick;
}

export interface CommDelivery {
  id: string;
  target: "toast" | "mobile-bridge" | "desktop-notification";
  title: string;
  body: string;
  insightId: string;
  ts: number;
}

export interface PipelineLogEntry {
  layer: LayerId;
  kind: string;
  message: string;
  ts: number;
}
