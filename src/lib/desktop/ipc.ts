/**
 * Bọc Tauri `invoke` — chỉ dùng từ UI / store, không import ngược vào `layers/`.
 */
export type PingResult =
  | { ok: true; message: string }
  | { ok: false; reason: "not_tauri" | "invoke_failed"; detail?: string };

export async function pingDesktop(): Promise<PingResult> {
  if (typeof window === "undefined") {
    return { ok: false, reason: "not_tauri" };
  }
  const w = window as unknown as { __TAURI_INTERNALS__?: unknown; __TAURI__?: unknown };
  if (!w.__TAURI_INTERNALS__ && !w.__TAURI__) {
    return { ok: false, reason: "not_tauri" };
  }
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const message = await invoke<string>("app_ping");
    return { ok: true, message };
  } catch (e) {
    return {
      ok: false,
      reason: "invoke_failed",
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}
