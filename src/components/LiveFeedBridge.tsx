"use client";

import { useEffect, useRef } from "react";
import { processWsPayload, setLiveFeedConnected } from "@/stores/demoSlice";
import { useAppDispatch } from "@/stores/hooks";

const WS_URL = "ws://127.0.0.1:3456";

export function LiveFeedBridge() {
  const dispatch = useAppDispatch();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(WS_URL);
    } catch {
      dispatch(setLiveFeedConnected(false));
      return;
    }

    ws.onopen = () => dispatch(setLiveFeedConnected(true));
    ws.onclose = () => dispatch(setLiveFeedConnected(false));
    ws.onerror = () => dispatch(setLiveFeedConnected(false));
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(String(ev.data));
        dispatch(processWsPayload(data));
      } catch {
        dispatch(
          processWsPayload({ type: "raw", raw: String(ev.data).slice(0, 160) }),
        );
      }
    };

    return () => {
      ws?.close();
      dispatch(setLiveFeedConnected(false));
    };
  }, [dispatch]);

  return null;
}
