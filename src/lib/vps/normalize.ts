/** Chuẩn hoá JSON từ `getliststockdata` (cấu trúc VPS có thể đổi — parse linh hoạt). */

export function normalizeVpsQuotesJson(raw: string): Record<string, number> {
  const out: Record<string, number> = {};
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return out;
  }

  const rows: unknown[] = Array.isArray(data)
    ? data
    : typeof data === "object" && data !== null && "data" in data && Array.isArray((data as { data: unknown }).data)
      ? ((data as { data: unknown[] }).data)
      : typeof data === "object" && data !== null && "d" in data && Array.isArray((data as { d: unknown }).d)
        ? ((data as { d: unknown[] }).d)
        : [];

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const sym = String(
      r.sym ?? r.code ?? r.Symbol ?? r.symbol ?? r.stock ?? "",
    )
      .trim()
      .toUpperCase();
    const px = Number(
      r.lastPrice ??
        r.matchPrice ??
        r.MatchPrice ??
        r.price ??
        r.close ??
        r.referencePrice ??
        r.refPrice,
    );
    if (sym && Number.isFinite(px) && px > 0) {
      out[sym] = px;
    }
  }
  return out;
}

export function buildSymbolCsv(
  positions: { symbol: string }[],
  watchlist: string[],
  max = 50,
): string {
  const set = new Set<string>();
  for (const p of positions) set.add(p.symbol.toUpperCase());
  for (const w of watchlist) set.add(w.toUpperCase());
  return Array.from(set)
    .filter(Boolean)
    .slice(0, max)
    .join(",");
}
