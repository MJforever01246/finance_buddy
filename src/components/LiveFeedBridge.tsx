"use client";

import { useEffect, useRef } from "react";
import { useDemoStore } from "@/stores/demo-store";

const WS_URL = "ws://127.0.0.1:3456";

export function LiveFeedBridge() {
  const setConnected = useDemoStore((s) => s.setLiveFeedConnected);
  const processWsPayload = useDemoStore((s) => s.processWsPayload);
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(WS_URL);
    } catch {
      setConnected(false);
      return;
    }

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(String(ev.data));
        processWsPayload(data);
      } catch {
        processWsPayload({ type: "raw", raw: String(ev.data).slice(0, 160) });
      }
    };

    return () => {
      ws?.close();
      setConnected(false);
    };
  }, [processWsPayload, setConnected]);

  return null;
}
