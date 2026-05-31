/**
 * Load TradingView charting_library.min.js một lần — chờ window.TradingView.widget sẵn sàng.
 * Fix: không resolve sớm khi <script> đã có trong DOM nhưng lib chưa execute (React Strict Mode / remount).
 */

import { tvError, tvLog } from "@/lib/chart/tv-log";

const TV_SCRIPT_SRC = "/chart/charting_library/charting_library.min.js";
const TV_SCRIPT_ID = "finance-buddy-tradingview-lib";

let loadPromise: Promise<void> | null = null;

function hasTradingViewGlobal(): boolean {
  return typeof window !== "undefined" && !!window.TradingView?.widget;
}

function waitForTradingView(maxMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (hasTradingViewGlobal()) {
      resolve();
      return;
    }

    const started = Date.now();
    const tick = () => {
      if (hasTradingViewGlobal()) {
        resolve();
        return;
      }
      if (Date.now() - started >= maxMs) {
        reject(
          new Error(
            `window.TradingView không sẵn sàng sau ${maxMs}ms — kiểm tra ${TV_SCRIPT_SRC} (404/CSP?)`,
          ),
        );
        return;
      }
      window.setTimeout(tick, 50);
    };
    tick();
  });
}

function appendScriptTag(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(TV_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (hasTradingViewGlobal() || existing.readyState === "complete" || existing.readyState === "loaded") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error(`Failed to load ${TV_SCRIPT_SRC}`)),
        { once: true },
      );
      return;
    }

    const s = document.createElement("script");
    s.id = TV_SCRIPT_ID;
    s.src = TV_SCRIPT_SRC;
    s.async = false;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${TV_SCRIPT_SRC} — file không tồn tại hoặc bị chặn`));
    document.head.appendChild(s);
  });
}

/** Đảm bảo TradingView library đã load (singleton, dedupe in-flight). */
export function ensureTradingViewLibrary(): Promise<void> {
  if (hasTradingViewGlobal()) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    tvLog("ensureTradingViewLibrary start", { src: TV_SCRIPT_SRC });
    await appendScriptTag();
    await waitForTradingView();
    tvLog("ensureTradingViewLibrary ready", {
      version: (window.TradingView as { version?: string })?.version,
    });
  })().catch((e) => {
    loadPromise = null;
    tvError("ensureTradingViewLibrary", e);
    throw e;
  });

  return loadPromise;
}

export function getTradingViewScriptSrc(): string {
  return TV_SCRIPT_SRC;
}
