"use client";

import type { ReactNode } from "react";
import { useRef } from "react";
import { Provider } from "react-redux";
import { makeStore } from "@/stores/store";

export function ReduxProvider({ children }: { children: ReactNode }) {
  const ref = useRef<ReturnType<typeof makeStore> | null>(null);
  if (!ref.current) {
    ref.current = makeStore();
  }
  return <Provider store={ref.current}>{children}</Provider>;
}
