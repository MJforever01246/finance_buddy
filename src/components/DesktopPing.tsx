"use client";

import { useState } from "react";
import { pingDesktop } from "@/lib/desktop/ipc";

export function DesktopPing() {
  const [hint, setHint] = useState<string | null>(null);

  return (
    <div className="mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          Desktop · IPC (Tauri)
        </span>
        <button
          type="button"
          onClick={async () => {
            setHint("…");
            const r = await pingDesktop();
            if (r.ok) setHint(r.message);
            else if (r.reason === "not_tauri")
              setHint("Chỉ chạy trong app desktop (npm run desktop:dev). Trình duyệt không có IPC.");
            else setHint(r.detail ?? "invoke lỗi");
          }}
          className="rounded-lg bg-violet-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500"
        >
          Ping Rust (`app_ping`)
        </button>
      </div>
      {hint ? (
        <p className="mt-2 font-mono text-xs text-[var(--muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
