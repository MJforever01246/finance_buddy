import { configureStore } from "@reduxjs/toolkit";
import {
  STORAGE_KEY,
  demoReducer,
  getInitialDemoState,
  loadPersisted,
  mergeHydrated,
  pickPersist,
} from "./demoSlice";

export function makeStore() {
  const base = getInitialDemoState();
  const hydrated =
    typeof window !== "undefined" ? loadPersisted() : null;
  const demo = hydrated ? mergeHydrated(base, hydrated) : base;

  const store = configureStore({
    reducer: { demo: demoReducer },
    preloadedState: { demo },
  });

  if (typeof window !== "undefined") {
    let t: ReturnType<typeof setTimeout> | undefined;
    store.subscribe(() => {
      const s = store.getState().demo;
      if (t !== undefined) clearTimeout(t);
      t = setTimeout(() => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(pickPersist(s)));
        } catch {
          /* ignore */
        }
      }, 300);
    });
  }

  return store;
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
