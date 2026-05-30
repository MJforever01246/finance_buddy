"use client";

import Link from "next/link";

const NAV = ["Dashboard", "Tìm kiếm cơ hội", "Biểu đồ", "Phân tích"] as const;

export function FireAntTopNav() {
  return (
    <header
      className="flex h-9 shrink-0 items-center gap-4 border-b px-3"
      style={{ borderColor: "var(--fa-border)", background: "var(--fa-surface)" }}
    >
      <Link href="/insight" className="flex shrink-0 items-center gap-1.5 font-semibold text-[var(--fa-accent)]">
        <span className="flex h-6 w-6 items-center justify-center rounded bg-[var(--fa-accent)] text-[10px] font-bold text-white">
          FB
        </span>
        <span className="hidden sm:inline">Finance Buddy</span>
      </Link>
      <nav className="hidden min-w-0 flex-1 gap-0.5 md:flex">
        {NAV.map((item, i) => (
          <button
            key={item}
            type="button"
            className={`shrink-0 px-2.5 py-1 text-[11px] ${
              i === 0 ? "rounded bg-white/10 font-medium text-[var(--fa-text)]" : "text-[var(--fa-muted)] hover:text-[var(--fa-text)]"
            }`}
          >
            {item}
          </button>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <div
          className="hidden items-center gap-1 rounded border px-2 py-0.5 sm:flex"
          style={{ borderColor: "var(--fa-border)" }}
        >
          <span className="text-[10px] text-[var(--fa-muted)]">Danh mục</span>
          <input
            type="search"
            placeholder="Tìm sổ / mã…"
            className="w-28 bg-transparent text-[11px] outline-none placeholder:text-[var(--fa-muted)]"
          />
        </div>
        <Link
          href="/bctc"
          className="text-[10px] text-[var(--fa-muted)] hover:text-[var(--fa-accent)]"
        >
          AI · BCTC
        </Link>
        <Link
          href="/"
          className="text-[10px] text-[var(--fa-muted)] hover:text-[var(--fa-accent)]"
        >
          Demo KT
        </Link>
      </div>
    </header>
  );
}
