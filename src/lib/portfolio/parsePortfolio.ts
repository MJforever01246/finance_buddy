import type { Position } from "@/lib/layers/shared/types";

export type ParsedPortfolioLine = {
  symbol: string;
  qty: number;
  avgCost: number;
};

export type ParsePortfolioResult = {
  positions: ParsedPortfolioLine[];
  errors: string[];
  skipped: number;
};

/** Chuẩn hoá giá vốn: 62 → 62000 nếu user nhập theo nghìn. */
export function normalizeAvgCost(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  if (raw < 1000) return Math.round(raw * 1000);
  return Math.round(raw);
}

/**
 * Một dòng: MÃ,SL,GIÁ_VỐN hoặc tab/khoảng trắng.
 * VD: VNM,100,62000 · FPT 80 112 · VCB;40;58000
 */
export function parsePortfolioLine(line: string): ParsedPortfolioLine | null {
  const raw = line.trim();
  if (!raw || raw.startsWith("#") || /^mã|symbol|sym/i.test(raw)) return null;

  const parts = raw
    .split(/[,;\t|]+|\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length < 3) return null;

  const symbol = parts[0]!.toUpperCase().replace(/[^A-Z0-9._-]/g, "");
  const qty = Number(parts[1]!.replace(/[^\d.-]/g, ""));
  const avgRaw = Number(parts[2]!.replace(/[^\d.-]/g, ""));
  if (!symbol || !Number.isFinite(qty) || qty <= 0) return null;

  const avgCost = normalizeAvgCost(avgRaw);
  if (!avgCost) return null;

  return { symbol, qty, avgCost };
}

export function parsePortfolioBlock(text: string, max = 80): ParsePortfolioResult {
  const positions: ParsedPortfolioLine[] = [];
  const errors: string[] = [];
  let skipped = 0;

  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const p = parsePortfolioLine(line);
    if (!p) {
      skipped += 1;
      if (line.trim() && !line.trim().startsWith("#")) {
        errors.push(`Bỏ qua: «${line.trim().slice(0, 48)}»`);
      }
      continue;
    }
    positions.push(p);
    if (positions.length >= max) break;
  }

  const merged = mergePortfolioLines(positions);
  return { positions: merged, errors: errors.slice(0, 8), skipped };
}

export function mergePortfolioLines(
  lines: ParsedPortfolioLine[],
): ParsedPortfolioLine[] {
  const map = new Map<string, { qty: number; costSum: number }>();
  for (const l of lines) {
    const prev = map.get(l.symbol);
    if (!prev) {
      map.set(l.symbol, { qty: l.qty, costSum: l.qty * l.avgCost });
      continue;
    }
    prev.qty += l.qty;
    prev.costSum += l.qty * l.avgCost;
  }
  return Array.from(map.entries()).map(([symbol, v]) => ({
    symbol,
    qty: v.qty,
    avgCost: Math.round(v.costSum / v.qty),
  }));
}

export function mergePositions(
  existing: Position[],
  incoming: ParsedPortfolioLine[],
  mode: "replace" | "merge",
): Position[] {
  if (mode === "replace") {
    return incoming.map((p) => ({ ...p }));
  }
  const map = new Map(existing.map((p) => [p.symbol, { ...p }]));
  for (const p of incoming) {
    const prev = map.get(p.symbol);
    if (!prev) {
      map.set(p.symbol, { ...p });
      continue;
    }
    const totalQty = prev.qty + p.qty;
    const costSum = prev.avgCost * prev.qty + p.avgCost * p.qty;
    map.set(p.symbol, {
      symbol: p.symbol,
      qty: totalQty,
      avgCost: Math.round(costSum / totalQty),
    });
  }
  return Array.from(map.values());
}

export const PORTFOLIO_IMPORT_EXAMPLE = `# Mã, Khối lượng, Giá vốn (VND hoặc nghìn)
VNM,100,62000
FPT,80,112
VCB,40,58000`;

export type PortfolioDraftRow = {
  id: string;
  symbol: string;
  qty: string;
  avgCost: string;
};

let draftRowSeq = 0;

export function newDraftRow(partial?: Partial<PortfolioDraftRow>): PortfolioDraftRow {
  draftRowSeq += 1;
  return {
    id: `pf-row-${draftRowSeq}`,
    symbol: partial?.symbol ?? "",
    qty: partial?.qty ?? "",
    avgCost: partial?.avgCost ?? "",
  };
}

export function positionsToDraftRows(
  positions: { symbol: string; qty: number; avgCost: number }[],
): PortfolioDraftRow[] {
  const rows = positions.map((p) =>
    newDraftRow({
      symbol: p.symbol,
      qty: String(p.qty),
      avgCost: String(p.avgCost),
    }),
  );
  rows.push(newDraftRow(), newDraftRow());
  return rows;
}

export function emptyDraftRows(count = 4): PortfolioDraftRow[] {
  return Array.from({ length: count }, () => newDraftRow());
}

/** Chuyển các ô form → danh mục hợp lệ (bỏ dòng trống). */
export function draftRowsToPositions(rows: PortfolioDraftRow[]): ParsedPortfolioLine[] {
  const lines: ParsedPortfolioLine[] = [];
  for (const row of rows) {
    const sym = row.symbol.trim().toUpperCase().replace(/[^A-Z0-9._-]/g, "");
    const qty = Number(row.qty.replace(/[^\d.-]/g, ""));
    const avgRaw = Number(row.avgCost.replace(/[^\d.-]/g, ""));
    if (!sym || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(avgRaw) || avgRaw <= 0) {
      continue;
    }
    const avgCost = normalizeAvgCost(avgRaw);
    if (avgCost) lines.push({ symbol: sym, qty, avgCost });
  }
  return mergePortfolioLines(lines);
}

/** Dán nhiều dòng (tab/comma/newline) vào lưới nhập. */
export function parsePasteIntoDraftRows(text: string): PortfolioDraftRow[] {
  const parsed = parsePortfolioBlock(text);
  if (!parsed.positions.length) return [];
  return parsed.positions.map((p) =>
    newDraftRow({
      symbol: p.symbol,
      qty: String(p.qty),
      avgCost: String(p.avgCost),
    }),
  );
}
