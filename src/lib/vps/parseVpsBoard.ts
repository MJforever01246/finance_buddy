import type { VpsBoardRow } from "./types";

function pickNum(r: Record<string, unknown>, keys: string[]): number {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(String(v).replace(/,/g, "").replace(/\s/g, ""));
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

function symFrom(r: Record<string, unknown>): string {
  const s = String(
    r.sym ?? r.StockSymbol ?? r.code ?? r.Symbol ?? r.symbol ?? "",
  )
    .trim()
    .toUpperCase();
  return s;
}

/** Map một object JSON dòng giá VPS → `VpsBoardRow` (nhiều alias field). */
export function mapRowFromVpsRecord(r: Record<string, unknown>): VpsBoardRow | null {
  const sym = symFrom(r);
  if (!sym) return null;

  const ref = pickNum(r, [
    "r",
    "referencePrice",
    "refPrice",
    "basicPrice",
    "priorClose",
    "RefPrice",
  ]);
  const ceiling = pickNum(r, ["c", "ceiling", "maxPrice", "Ceiling", "max"]);
  const floor = pickNum(r, ["f", "floor", "minPrice", "Floor", "min"]);
  const matchP = pickNum(r, [
    "lastPrice",
    "matchPrice",
    "MatchPrice",
    "price",
    "close",
  ]);
  const matchV = pickNum(r, [
    "lastVolume",
    "lot",
    "Lot",
    "lastQty",
    "matchVolume",
    "MatchVol",
  ]);

  const changeAbs =
    pickNum(r, ["change", "Change", "priceChange", "diff"]) ||
    (ref > 0 && matchP > 0 ? matchP - ref : 0);
  const changePct =
    pickNum(r, ["changePc", "changePct", "ChangePc", "percent"]) ||
    (ref > 0 ? ((matchP - ref) / ref) * 100 : 0);

  return {
    sym,
    ceiling,
    floor,
    ref,
    totalVol: pickNum(r, [
      "totalVolume",
      "TotalVolume",
      "totalVol",
      "lotTotal",
      "LotTotal",
      "accumulatedVolume",
    ]),
    bidP3: pickNum(r, ["best3Bid", "g3", "buyPrice3", "bp3", "bid3"]),
    bidV3: pickNum(r, ["best3BidVol", "g3Volumn", "buyVolume3", "bv3"]),
    bidP2: pickNum(r, ["best2Bid", "g2", "buyPrice2", "bp2"]),
    bidV2: pickNum(r, ["best2BidVol", "g2Volumn", "buyVolume2", "bv2"]),
    bidP1: pickNum(r, ["best1Bid", "g1", "buyPrice1", "bp1", "bid1"]),
    bidV1: pickNum(r, [
      "best1BidVol",
      "g1Volumn",
      "buyVolume1",
      "bv1",
      "bid1Volume",
    ]),
    matchP,
    matchV,
    changeAbs,
    changePct,
    askP1: pickNum(r, ["best1Offer", "s1", "sellPrice1", "sp1", "ask1"]),
    askV1: pickNum(r, [
      "best1OfferVol",
      "s1Volumn",
      "sellVolume1",
      "sv1",
      "ask1Volume",
    ]),
    askP2: pickNum(r, ["best2Offer", "s2", "sellPrice2"]),
    askV2: pickNum(r, ["best2OfferVol", "s2Volumn", "sellVolume2"]),
    askP3: pickNum(r, ["best3Offer", "s3", "sellPrice3"]),
    askV3: pickNum(r, ["best3OfferVol", "s3Volumn", "sellVolume3"]),
    high: pickNum(r, ["highPrice", "high", "High", "maxPriceIntraday"]),
    low: pickNum(r, ["lowPrice", "low", "Low", "minPriceIntraday"]),
    avg: pickNum(r, ["avePrice", "averagePrice", "avgPrice", "ar", "tb"]),
    frBuy: pickNum(r, ["frBuyVol", "fBVol", "foreignBuy", "nMua"]),
    frSell: pickNum(r, ["frSellVol", "fSVol", "foreignSell", "nBan"]),
    frRoom: pickNum(r, ["frRoom", "nRoom", "foreignRoom", "nnRoom"]),
  };
}

function rowsArrayFromJson(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data;
    if (Array.isArray(o.d)) return o.d;
    if (Array.isArray(o.rows)) return o.rows;
  }
  return [];
}

export function parseStockRowsJson(raw: string): Record<string, VpsBoardRow> {
  const out: Record<string, VpsBoardRow> = {};
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return out;
  }
  for (const row of rowsArrayFromJson(data)) {
    if (!row || typeof row !== "object") continue;
    const m = mapRowFromVpsRecord(row as Record<string, unknown>);
    if (m) out[m.sym] = m;
  }
  return out;
}
