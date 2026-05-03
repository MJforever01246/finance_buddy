"use client";

import type { ReactNode } from "react";
import { StoreRehydrate } from "@/components/StoreRehydrate";
import { ThemeProvider } from "./ThemeProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <StoreRehydrate />
      {children}
    </ThemeProvider>
  );
}
