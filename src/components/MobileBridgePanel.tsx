"use client";

import { useMemo } from "react";
import { clearCommQueue } from "@/stores/demoSlice";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";

export function MobileBridgePanel() {
  const dispatch = useAppDispatch();
  const commQueue = useAppSelector((s) => s.demo.commQueue);

  const mobileItems = useMemo(
    () => commQueue.filter((d) => d.target === "mobile-bridge").slice(0, 12),
    [commQueue],
  );

  return (
    <div className="flex h-full min-h-[200px] flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text)]">Mobile bridge (demo)</h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Hàng đợi insight gửi sang mobile — Communication Layer
          </p>
        </div>
        {mobileItems.length ? (
          <button
            type="button"
            onClick={() => dispatch(clearCommQueue())}
            className="shrink-0 rounded-md px-2 py-1 text-[10px] text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
          >
            Xóa hàng đợi
          </button>
        ) : null}
      </div>

      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
        {mobileItems.map((d) => (
          <li
            key={d.id}
            className="rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2.5 text-xs"
          >
            <p className="font-medium leading-snug text-[var(--text)]">{d.title}</p>
            <p className="mt-1 line-clamp-2 text-[var(--muted)]">{d.body}</p>
            <p className="mt-1.5 font-mono text-[9px] text-[var(--muted)]">
              {new Date(d.ts).toLocaleTimeString("vi-VN")} · {d.insightId.slice(0, 12)}
            </p>
          </li>
        ))}
        {!mobileItems.length ? (
          <li className="py-6 text-center text-sm text-[var(--muted)]">
            Chưa có — tick hoặc bật auto để sinh insight.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
