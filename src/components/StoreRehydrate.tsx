"use client";

import { useEffect } from "react";
import { useDemoStore } from "@/stores/demo-store";

/** Đồng bộ Zustand persist từ localStorage sau khi client mount (Next.js). */
export function StoreRehydrate() {
  useEffect(() => {
    void useDemoStore.persist.rehydrate();
  }, []);
  return null;
}
