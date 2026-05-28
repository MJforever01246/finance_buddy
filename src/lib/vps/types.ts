/** Một dòng bảng giá sau khi map từ JSON VPS (`getliststockdata`). */
export type VpsBoardRow = {
  sym: string;
  ceiling: number;
  floor: number;
  ref: number;
  totalVol: number;
  bidP3: number;
  bidV3: number;
  bidP2: number;
  bidV2: number;
  bidP1: number;
  bidV1: number;
  matchP: number;
  matchV: number;
  changeAbs: number;
  changePct: number;
  askP1: number;
  askV1: number;
  askP2: number;
  askV2: number;
  askP3: number;
  askV3: number;
  high: number;
  low: number;
  avg: number;
  frBuy: number;
  frSell: number;
  frRoom: number;
};

export type VpsStockMeta = {
  sym: string;
  name: string;
  industry: string;
  /** 1 HOSE, 2 HNX, 9 UPCOM — tùy feed; UNKNOWN nếu không rõ */
  market: "HOSE" | "HNX" | "HNX30" | "UPCOM" | "UNKNOWN";
};
