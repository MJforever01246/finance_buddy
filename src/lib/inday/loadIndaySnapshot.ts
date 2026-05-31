import { mapRowFromVpsRecord } from "@/lib/vps/parseVpsBoard";
import type { VpsBoardRow, VpsStockMeta } from "@/lib/vps/types";

export type IndayDataset = "hose" | "vn30";

export type IndaySnapshot = {
  dataset: IndayDataset;
  tradingDate: string;
  universe: VpsStockMeta[];
  board: Record<string, VpsBoardRow>;
  symbolOrder: string[];
};

const INDDAY_URL: Record<IndayDataset, string> = {
  hose: "/data/inday/hose.json",
  vn30: "/data/inday/vn30.json",
};

function mapIndayMeta(r: Record<string, unknown>): VpsStockMeta | null {
  const sym = String(r.symbol ?? r.StockSymbol ?? "")
    .trim()
    .toUpperCase();
  if (!sym) return null;

  const ex = String(r.exchangeCode ?? r.marketCode ?? "HOSE").toUpperCase();
  let market: VpsStockMeta["market"] = "UNKNOWN";
  if (ex === "HOSE") market = "HOSE";
  else if (ex === "HNX" || ex === "HNX30") market = "HNX";
  else if (ex === "UPCOM") market = "UPCOM";

  return {
    sym,
    name: String(r.stockName ?? r.orgShortName ?? sym).trim(),
    industry: String(r.stockType ?? "").trim(),
    market,
  };
}

export function parseIndayRows(rows: unknown[]): Omit<IndaySnapshot, "dataset"> {
  const board: Record<string, VpsBoardRow> = {};
  const universe: VpsStockMeta[] = [];
  let tradingDate = "";

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    if (!tradingDate && typeof rec.tradingDate === "string") {
      tradingDate = rec.tradingDate;
    }
    const mapped = mapRowFromVpsRecord(rec);
    if (mapped) board[mapped.sym] = mapped;
    const meta = mapIndayMeta(rec);
    if (meta) universe.push(meta);
  }

  return {
    tradingDate,
    universe,
    board,
    symbolOrder: Object.keys(board),
  };
}

/** Tải snapshot intraday offline (public/data/inday/*.json). */
export async function fetchIndaySnapshot(dataset: IndayDataset): Promise<IndaySnapshot> {
  const url = INDDAY_URL[dataset];
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Không tải được ${url} (${res.status})`);
  }
  const rows = (await res.json()) as unknown[];
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`Snapshot ${dataset} rỗng`);
  }
  const parsed = parseIndayRows(rows);
  return { dataset, ...parsed };
}
