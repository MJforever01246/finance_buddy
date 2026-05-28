"use client";

import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  addSymbolToWatchlist,
  createSavedWatchlist,
  deleteSavedWatchlist,
  removeSymbolFromWatchlist,
  setSelectedSymbol,
} from "@/stores/demoSlice";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultSymbols?: string;
}

export function WatchlistPopup({ open, onClose, defaultSymbols }: Props) {
  const dispatch = useAppDispatch();
  const savedWatchlists = useAppSelector((s) => s.demo.savedWatchlists);

  const [tab, setTab] = useState<"manage" | "create">("manage");
  const [newName, setNewName] = useState("");
  const [newSymbols, setNewSymbols] = useState(defaultSymbols || "");
  const [addInput, setAddInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!open) return null;

  const handleCreate = () => {
    const syms = newSymbols
      .split(/[\s,;]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    if (!syms.length && !newName.trim()) return;
    dispatch(
      createSavedWatchlist({ name: newName || "Watchlist", symbols: syms }),
    );
    setNewName("");
    setNewSymbols("");
    setTab("manage");
  };

  const handleAddSymbol = (watchlistId: string) => {
    if (!addInput.trim()) return;
    const symbols = addInput
      .toUpperCase()
      .split(/[\s,;]+/)
      .filter(Boolean);
    for (const sym of symbols) {
      dispatch(addSymbolToWatchlist({ watchlistId, symbol: sym }));
    }
    setAddInput("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[10vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[70vh] w-full max-w-lg flex-col rounded-xl border border-[#1e293b] bg-[#0f1419] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1e293b] px-4 py-3">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setTab("manage")}
              className={`rounded px-3 py-1 text-[11px] font-medium ${
                tab === "manage"
                  ? "bg-amber-500/20 text-amber-300"
                  : "text-[#94a3b8] hover:text-[#e2e8f0]"
              }`}
            >
              Quản lý ({savedWatchlists.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("create");
                setNewSymbols(defaultSymbols || "");
              }}
              className={`rounded px-3 py-1 text-[11px] font-medium ${
                tab === "create"
                  ? "bg-amber-500/20 text-amber-300"
                  : "text-[#94a3b8] hover:text-[#e2e8f0]"
              }`}
            >
              + Tạo mới
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-xs text-[#94a3b8] hover:bg-[#1e293b] hover:text-[#f8fafc]"
          >
            ✕
          </button>
        </div>

        {/* Create tab */}
        {tab === "create" && (
          <div className="border-b border-[#1e293b] px-4 py-3">
            <input
              className="w-full rounded border border-[#1e293b] bg-[#050608] px-3 py-2 text-sm text-[#e2e8f0] placeholder:text-[#64748b] focus:border-amber-500/50 focus:outline-none"
              placeholder="Tên watchlist"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <textarea
              className="mt-2 h-20 w-full resize-y rounded border border-[#1e293b] bg-[#050608] px-3 py-2 font-mono text-xs text-[#e2e8f0] placeholder:text-[#64748b] focus:border-amber-500/50 focus:outline-none"
              placeholder="Mã (phân cách dấu phẩy): VNM, FPT, VCB, ACB..."
              value={newSymbols}
              onChange={(e) => setNewSymbols(e.target.value)}
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTab("manage")}
                className="rounded px-3 py-1.5 text-[11px] text-[#94a3b8] hover:bg-[#1e293b]"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={handleCreate}
                className="rounded bg-amber-500 px-4 py-1.5 text-[11px] font-medium text-black hover:bg-amber-400"
              >
                Tạo watchlist
              </button>
            </div>
          </div>
        )}

        {/* Manage tab */}
        {tab === "manage" && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            {savedWatchlists.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-[#64748b]">Chưa có watchlist nào</p>
                <button
                  type="button"
                  onClick={() => setTab("create")}
                  className="mt-2 rounded bg-amber-500/20 px-3 py-1.5 text-[11px] font-medium text-amber-300 hover:bg-amber-500/30"
                >
                  Tạo watchlist đầu tiên
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#1a222c]">
                {savedWatchlists.map((wl) => {
                  const isEditing = editingId === wl.id;
                  return (
                    <div key={wl.id} className="px-4 py-3">
                      {/* Watchlist header */}
                      <div className="flex items-center justify-between">
                        <h4 className="text-[12px] font-semibold text-[#f8fafc]">
                          {wl.name}
                          <span className="ml-2 text-[10px] font-normal text-[#64748b]">
                            {wl.symbols.length} mã
                          </span>
                        </h4>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingId(isEditing ? null : wl.id)
                            }
                            className={`rounded px-2 py-0.5 text-[10px] ${
                              isEditing
                                ? "bg-amber-500/20 text-amber-300"
                                : "text-[#64748b] hover:text-[#e2e8f0]"
                            }`}
                          >
                            {isEditing ? "Xong" : "Sửa"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Xóa "${wl.name}"?`))
                                dispatch(deleteSavedWatchlist(wl.id));
                            }}
                            className="rounded px-2 py-0.5 text-[10px] text-rose-400 hover:bg-rose-500/10"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>

                      {/* Symbol chips */}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {wl.symbols.map((sym) => (
                          <span
                            key={sym}
                            className="group inline-flex items-center gap-0.5 rounded bg-[#1a222c] px-2 py-1 text-[11px] font-medium text-[#e2e8f0] cursor-pointer hover:bg-[#2a3340]"
                            onClick={() => {
                              dispatch(setSelectedSymbol(sym));
                              onClose();
                            }}
                          >
                            {sym}
                            {isEditing && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  dispatch(
                                    removeSymbolFromWatchlist({
                                      watchlistId: wl.id,
                                      symbol: sym,
                                    }),
                                  );
                                }}
                                className="ml-0.5 text-[9px] text-rose-400 hover:text-rose-300"
                              >
                                ✕
                              </button>
                            )}
                          </span>
                        ))}
                        {wl.symbols.length === 0 && (
                          <span className="text-[10px] text-[#64748b]">
                            Trống — thêm mã bên dưới
                          </span>
                        )}
                      </div>

                      {/* Add symbol input */}
                      {isEditing && (
                        <div className="mt-2 flex gap-1.5">
                          <input
                            type="text"
                            value={addInput}
                            onChange={(e) => setAddInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddSymbol(wl.id);
                            }}
                            placeholder="Thêm mã (VD: VNM, FPT)"
                            className="flex-1 rounded border border-[#1e293b] bg-[#050608] px-2 py-1.5 text-[11px] text-[#e2e8f0] placeholder:text-[#64748b] focus:border-amber-500/50 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddSymbol(wl.id)}
                            className="rounded bg-amber-500/20 px-3 py-1.5 text-[10px] font-medium text-amber-300 hover:bg-amber-500/30"
                          >
                            Thêm
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
