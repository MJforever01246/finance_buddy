/** Log datafeed / TradingView widget — prefix [TV] trong DevTools console. */

const PREFIX = "[TV datafeed]";

export function tvLog(phase: string, detail?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  if (detail) {
    console.log(PREFIX, phase, detail);
  } else {
    console.log(PREFIX, phase);
  }
}

export function tvWarn(phase: string, detail?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  if (detail) {
    console.warn(PREFIX, phase, detail);
  } else {
    console.warn(PREFIX, phase);
  }
}

export function tvError(phase: string, err: unknown, detail?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const msg = err instanceof Error ? err.message : String(err);
  console.error(PREFIX, phase, msg, detail ?? "");
}
