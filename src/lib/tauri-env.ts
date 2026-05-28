export function isTauriRuntime(): boolean {
  if (typeof window === "undefined") return false;
  if ("__TAURI_INTERNALS__" in window) return true;
  const w = window as Window & { __TAURI__?: unknown };
  return Boolean(w.__TAURI__);
}
