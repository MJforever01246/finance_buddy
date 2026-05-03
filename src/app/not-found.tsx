import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--bg)] px-4 text-[var(--text)]">
      <p className="text-sm text-[var(--muted)]">404</p>
      <h1 className="text-lg font-semibold">Không tìm thấy trang</h1>
      <Link href="/" className="text-sm text-blue-600 underline dark:text-blue-400">
        Về trang chủ
      </Link>
    </div>
  );
}
