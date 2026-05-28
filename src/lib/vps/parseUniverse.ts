import { VN30_SYMBOLS } from "./vn30";
import type { VpsStockMeta } from "./types";

function marketFromStockNo(n: unknown): VpsStockMeta["market"] {
  const v = Number(n);
  if (v === 1 || v === 10) return "HOSE";
  if (v === 2) return "HNX";
  if (v === 9) return "UPCOM";
  return "UNKNOWN";
}

function itemArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data;
    if (Array.isArray(o.d)) return o.d;
    if (Array.isArray(o.rows)) return o.rows;
  }
  return [];
}

/** Parse `getlistallstock` → meta từng mã (sym, tên, ngành, sàn). */
export function parseUniverseJson(raw: string): VpsStockMeta[] {
  const out: VpsStockMeta[] = [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return out;
  }
  for (const row of itemArray(data)) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const sym = String(
      r.StockSymbol ?? r.sym ?? r.code ?? r.Symbol ?? "",
    )
      .trim()
      .toUpperCase();
    if (!sym) continue;
    const name = String(
      r.StockName ?? r.name ?? r.Name ?? r.stockName ?? sym,
    ).trim();
    const industry = String(
      r.industryName ??
        r.IndName ??
        r.sectorName ??
        r.IndustryName ??
        r.industry ??
        "",
    ).trim();
    let market = marketFromStockNo(r.StockNo ?? r.stockNo ?? r.marketId);
    if (market === "UNKNOWN" && VN30_SYMBOLS.has(sym)) market = "HOSE";
    out.push({ sym, name, industry, market });
  }
  return out;
}
