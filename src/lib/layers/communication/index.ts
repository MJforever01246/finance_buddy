import type { CommDelivery, Insight } from "@/lib/layers/shared/types";

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function insightToDeliveries(insight: Insight): CommDelivery[] {
  const mobile: CommDelivery = {
    id: uid("comm"),
    target: "mobile-bridge",
    title: insight.title,
    body: insight.detail.slice(0, 280),
    insightId: insight.id,
    ts: Date.now(),
  };
  const toast: CommDelivery = {
    id: uid("comm"),
    target: "toast",
    title: `[Smart Alert] ${insight.title}`,
    body: insight.relatedSymbols.join(", "),
    insightId: insight.id,
    ts: Date.now(),
  };
  return [toast, mobile];
}
