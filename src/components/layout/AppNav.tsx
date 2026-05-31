"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

const ROUTES = [
  { href: "/", label: "Bảng giá" },
  { href: "/insight", label: "Danh mục" },
  { href: "/bctc", label: "AI · BCTC" },
  { href: "/crawl", label: "Dữ liệu" },
] as const;

export function AppNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/insight")) return null;

  return (
    <header className="fb-nav sticky top-0 z-40 shrink-0 border-b">
      <div className="mx-auto flex h-14 max-w-[1680px] items-center gap-3 px-3 sm:px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--accent)] text-[11px] font-bold text-white">
            FB
          </span>
          <span className="hidden text-sm font-semibold tracking-tight text-[var(--text)] sm:inline">
            Finance Buddy
          </span>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center gap-0.5 md:flex" aria-label="Chính">
          {ROUTES.map(({ href, label }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-[var(--accent)]/12 text-[var(--accent)] ring-1 ring-[var(--accent)]/25"
                    : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
