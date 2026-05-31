"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  draftRowsToPositions,
  emptyDraftRows,
  newDraftRow,
  parsePasteIntoDraftRows,
  positionsToDraftRows,
  type PortfolioDraftRow,
} from "@/lib/portfolio/parsePortfolio";
import { importPortfolioWithPrices } from "@/stores/demoSlice";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";

type ColKey = "symbol" | "qty" | "avgCost";
const COLS: ColKey[] = ["symbol", "qty", "avgCost"];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function PortfolioImportPopup({ open, onClose }: Props) {
  const dispatch = useAppDispatch();
  const positions = useAppSelector((s) => s.demo.positions);
  const vpsLoading = useAppSelector((s) => s.demo.vpsLoading);

  const [rows, setRows] = useState<PortfolioDraftRow[]>(() => emptyDraftRows(4));
  const [importMode, setImportMode] = useState<"replace" | "merge">("replace");
  const [bulkPaste, setBulkPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const firstSymbolRef = useRef<HTMLInputElement | null>(null);

  const resetForm = useCallback(() => {
    if (positions.length) {
      setRows(positionsToDraftRows(positions));
    } else {
      setRows(emptyDraftRows(4));
    }
    setImportMode("replace");
    setBulkPaste(false);
    setPasteText("");
  }, [positions]);

  useEffect(() => {
    if (open) {
      resetForm();
      const t = window.setTimeout(() => firstSymbolRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [open, resetForm]);

  const validCount = useMemo(
    () => draftRowsToPositions(rows).length,
    [rows],
  );

  const setRef = (rowId: string, col: ColKey, el: HTMLInputElement | null) => {
    const key = `${rowId}-${col}`;
    if (el) inputRefs.current.set(key, el);
    else inputRefs.current.delete(key);
  };

  const focusCell = (rowIndex: number, colIndex: number) => {
    const row = rows[rowIndex];
    if (!row) return;
    const col = COLS[colIndex];
    if (!col) return;
    inputRefs.current.get(`${row.id}-${col}`)?.focus();
  };

  const moveFocus = (rowIndex: number, colIndex: number, backward: boolean) => {
    if (backward) {
      if (colIndex > 0) {
        focusCell(rowIndex, colIndex - 1);
        return;
      }
      if (rowIndex > 0) focusCell(rowIndex - 1, 2);
      return;
    }

    if (colIndex < 2) {
      focusCell(rowIndex, colIndex + 1);
      return;
    }

    const row = rows[rowIndex];
    const hasData =
      row &&
      (row.symbol.trim() || row.qty.trim() || row.avgCost.trim());
    const nextRow = rowIndex + 1;

    if (nextRow >= rows.length && hasData) {
      const newRow = newDraftRow();
      setRows((prev) => [...prev, newRow]);
      window.requestAnimationFrame(() => {
        inputRefs.current.get(`${newRow.id}-symbol`)?.focus();
      });
      return;
    }

    if (nextRow < rows.length) focusCell(nextRow, 0);
  };

  const handleFieldKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    colIndex: number,
  ) => {
    if (e.key === "Tab") {
      e.preventDefault();
      moveFocus(rowIndex, colIndex, e.shiftKey);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      moveFocus(rowIndex, colIndex, false);
    }
  };

  const updateRow = (id: string, patch: Partial<PortfolioDraftRow>) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  };

  const removeRow = (id: string) => {
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return next.length ? next : [newDraftRow()];
    });
  };

  const addRow = () => {
    setRows((prev) => [...prev, newDraftRow()]);
  };

  const handlePasteOnSymbol = (
    e: React.ClipboardEvent<HTMLInputElement>,
    rowIndex: number,
  ) => {
    const text = e.clipboardData.getData("text");
    if (!/[\n\t,;]/.test(text)) return;

    e.preventDefault();
    const pasted = parsePasteIntoDraftRows(text);
    if (!pasted.length) return;

    setRows((prev) => {
      const next = [...prev];
      pasted.forEach((p, i) => {
        const idx = rowIndex + i;
        if (idx < next.length) next[idx] = { ...next[idx]!, ...p, id: next[idx]!.id };
        else next.push(p);
      });
      if (next[next.length - 1]?.symbol.trim()) next.push(newDraftRow());
      return next;
    });

    window.requestAnimationFrame(() => {
      const targetIdx = rowIndex + pasted.length;
      if (targetIdx < rows.length + pasted.length) focusCell(targetIdx, 0);
    });
  };

  const applyBulkPaste = () => {
    const pasted = parsePasteIntoDraftRows(pasteText);
    if (!pasted.length) return;
    setRows([...pasted, newDraftRow(), newDraftRow()]);
    setBulkPaste(false);
    setPasteText("");
    window.requestAnimationFrame(() => focusCell(0, 0));
  };

  const handleImport = () => {
    const parsed = draftRowsToPositions(rows);
    if (!parsed.length) return;
    void dispatch(
      importPortfolioWithPrices({ positions: parsed, mode: importMode }),
    ).then((r) => {
      if (importPortfolioWithPrices.fulfilled.match(r)) onClose();
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[6vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
        role="dialog"
        aria-labelledby="portfolio-import-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div>
            <h2
              id="portfolio-import-title"
              className="text-sm font-semibold text-[var(--text)]"
            >
              Import nhanh danh mục
            </h2>
            <p className="mt-0.5 text-[11px] text-[var(--muted)]">
              Tab / Enter chuyển ô kế tiếp · dán nhiều dòng vào cột Mã
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--surface-2)]"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-[11px]">
          <span className="text-[var(--muted)]">Chế độ:</span>
          <label className="inline-flex items-center gap-1">
            <input
              type="radio"
              checked={importMode === "replace"}
              onChange={() => setImportMode("replace")}
            />
            Thay thế
          </label>
          <label className="inline-flex items-center gap-1">
            <input
              type="radio"
              checked={importMode === "merge"}
              onChange={() => setImportMode("merge")}
            />
            Gộp thêm
          </label>
          <span className="text-[var(--muted)]">
            · {validCount} mã hợp lệ
          </span>
          <button
            type="button"
            onClick={() => setBulkPaste((v) => !v)}
            className="ml-auto text-[var(--accent)] hover:underline"
          >
            {bulkPaste ? "Ẩn dán hàng loạt" : "Dán hàng loạt"}
          </button>
        </div>

        {bulkPaste ? (
          <div className="border-b border-[var(--border)] px-4 py-3">
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-[11px]"
              placeholder="VNM,100,62000 — mỗi dòng một mã"
            />
            <button
              type="button"
              onClick={applyBulkPaste}
              className="mt-2 fb-toolbar-btn text-[11px]"
            >
              Đưa vào lưới
            </button>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div className="mb-1 grid grid-cols-[minmax(72px,1fr)_minmax(64px,0.7fr)_minmax(88px,0.9fr)_28px] gap-2 text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
            <span>Mã</span>
            <span className="text-right">KL</span>
            <span className="text-right">Giá vốn</span>
            <span />
          </div>

          <div className="space-y-1.5">
            {rows.map((row, rowIndex) => (
              <div
                key={row.id}
                className="grid grid-cols-[minmax(72px,1fr)_minmax(64px,0.7fr)_minmax(88px,0.9fr)_28px] gap-2"
              >
                <input
                  ref={(el) => {
                    setRef(row.id, "symbol", el);
                    if (rowIndex === 0) firstSymbolRef.current = el;
                  }}
                  type="text"
                  value={row.symbol}
                  onChange={(e) =>
                    updateRow(row.id, {
                      symbol: e.target.value.toUpperCase(),
                    })
                  }
                  onKeyDown={(e) => handleFieldKeyDown(e, rowIndex, 0)}
                  onPaste={(e) => handlePasteOnSymbol(e, rowIndex)}
                  placeholder="VNM"
                  autoComplete="off"
                  spellCheck={false}
                  className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 font-mono text-xs uppercase text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
                />
                <input
                  ref={(el) => setRef(row.id, "qty", el)}
                  type="text"
                  inputMode="numeric"
                  value={row.qty}
                  onChange={(e) => updateRow(row.id, { qty: e.target.value })}
                  onKeyDown={(e) => handleFieldKeyDown(e, rowIndex, 1)}
                  placeholder="100"
                  className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-right font-data text-xs tabular-nums text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
                />
                <input
                  ref={(el) => setRef(row.id, "avgCost", el)}
                  type="text"
                  inputMode="decimal"
                  value={row.avgCost}
                  onChange={(e) =>
                    updateRow(row.id, { avgCost: e.target.value })
                  }
                  onKeyDown={(e) => handleFieldKeyDown(e, rowIndex, 2)}
                  placeholder="62000"
                  title="VND đầy đủ hoặc nghìn (112 → 112.000)"
                  className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 text-right font-data text-xs tabular-nums text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="rounded text-[10px] text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-rose-500"
                  title="Xóa dòng"
                  tabIndex={-1}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addRow}
            className="mt-2 text-[11px] text-[var(--accent)] hover:underline"
          >
            + Thêm dòng
          </button>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] px-4 py-3">
          <button type="button" onClick={onClose} className="fb-toolbar-btn text-[11px]">
            Huỷ
          </button>
          <button
            type="button"
            disabled={vpsLoading || validCount === 0}
            onClick={handleImport}
            className="fb-toolbar-btn-primary text-[11px] disabled:opacity-50"
          >
            {vpsLoading ? "Đang import…" : "Import & lấy giá"}
          </button>
        </div>
      </div>
    </div>
  );
}
