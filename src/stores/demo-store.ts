"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  CommDelivery,
  Insight,
  MarketTick,
  PipelineLogEntry,
  Position,
  SavedNewsLink,
} from "@/lib/layers/types";
import { parseNewsImportBlock } from "@/lib/news-import";
import {
  fakeNewsLinks,
  ingestExternalTick,
  pushDemoTick,
  seedPrices,
} from "@/lib/orchestration/pipeline";

const STORAGE_KEY = "finance-buddy-demo-v1";
const MAX_LOG = 80;
const MAX_TICKS = 24;

type DemoState = {
  rotateIndex: number;
  prices: Record<string, number>;
  positions: Position[];
  watchlist: string[];
  newsLinks: SavedNewsLink[];
  ticks: MarketTick[];
  insights: Insight[];
  commQueue: CommDelivery[];
  pipelineLog: PipelineLogEntry[];
  liveFeedConnected: boolean;
  lastWsMessage: string | null;
  autoTickerOn: boolean;
  toast: string | null;
  selectedSymbol: string | null;

  pushManualTick: () => void;
  toggleAutoTicker: () => void;
  importPortfolioDemo: () => void;
  addNewsDemo: () => void;
  addNewsClip: (item: { url: string; title: string; preview?: string }) => void;
  importNewsBulk: (text: string) => number;
  clearPersistedDemoData: () => void;
  setSelectedSymbol: (symbol: string | null) => void;
  clearLog: () => void;
  dismissToast: () => void;
  setLiveFeedConnected: (v: boolean) => void;
  processWsPayload: (payload: unknown) => void;
};

export const useDemoStore = create<DemoState>()(
  persist(
    (set, get) => {
      let timer: ReturnType<typeof setInterval> | null = null;

      const pushTickFlow = () => {
        const s = get();
        const result = pushDemoTick({
          prices: s.prices,
          positions: s.positions,
          rotateIndex: s.rotateIndex,
        });

        const toastItem = result.deliveries.find((x) => x.target === "toast");

        set({
          rotateIndex: result.rotateIndex,
          prices: result.prices,
          ticks: [result.tick, ...s.ticks].slice(0, MAX_TICKS),
          insights: [...result.insights, ...s.insights].slice(0, 40),
          commQueue: [...result.deliveries, ...s.commQueue].slice(0, 60),
          pipelineLog: [...result.logs, ...s.pipelineLog].slice(0, MAX_LOG),
          toast: toastItem ? `${toastItem.title}\n${toastItem.body}` : s.toast,
        });
      };

      const initialPrices = seedPrices();
      const initialSymbols = Object.keys(initialPrices);

      return {
        rotateIndex: 0,
        prices: initialPrices,
        positions: [{ symbol: "VNM", qty: 100, avgCost: 62 }],
        watchlist: ["FPT", "VCB"],
        newsLinks: [],
        ticks: [],
        insights: [],
        commQueue: [],
        pipelineLog: [],
        liveFeedConnected: false,
        lastWsMessage: null,
        autoTickerOn: false,
        toast: null,
        selectedSymbol: initialSymbols[0] ?? null,

        pushManualTick: () => pushTickFlow(),

        toggleAutoTicker: () => {
          const on = !get().autoTickerOn;
          if (timer) {
            clearInterval(timer);
            timer = null;
          }
          if (on) {
            timer = setInterval(() => pushTickFlow(), 1400);
          }
          set({ autoTickerOn: on });
        },

        importPortfolioDemo: () =>
          set({
            positions: [
              { symbol: "VNM", qty: 200, avgCost: 60 },
              { symbol: "FPT", qty: 80, avgCost: 112 },
              { symbol: "VCB", qty: 40, avgCost: 58 },
            ],
            pipelineLog: [
              {
                layer: "data",
                kind: "portfolio.import",
                message: "Import demo 3 mã — Data Layer",
                ts: Date.now(),
              } satisfies PipelineLogEntry,
              ...get().pipelineLog,
            ].slice(0, MAX_LOG),
          }),

        addNewsDemo: () =>
          set((s) => {
            const links = fakeNewsLinks(2);
            return {
              newsLinks: [...links, ...s.newsLinks].slice(0, 80),
              pipelineLog: [
                {
                  layer: "data",
                  kind: "news.saved",
                  message: `Lưu ${links.length} link tin (demo crawl)`,
                  ts: Date.now(),
                } satisfies PipelineLogEntry,
                ...s.pipelineLog,
              ].slice(0, MAX_LOG),
            };
          }),

        addNewsClip: (item) =>
          set((s) => {
            const entry: SavedNewsLink = {
              id: `clip-${Date.now()}`,
              url: item.url.trim(),
              title: item.title.trim() || item.url.slice(0, 48),
              preview: item.preview?.trim(),
              ts: Date.now(),
            };
            return {
              newsLinks: [entry, ...s.newsLinks].slice(0, 80),
              pipelineLog: [
                {
                  layer: "data",
                  kind: "news.clip",
                  message: `Lưu link: ${entry.title.slice(0, 60)}`,
                  ts: Date.now(),
                } satisfies PipelineLogEntry,
                ...s.pipelineLog,
              ].slice(0, MAX_LOG),
            };
          }),

        importNewsBulk: (text) => {
          const parsed = parseNewsImportBlock(text, 80);
          if (!parsed.length) return 0;
          const now = Date.now();
          const entries: SavedNewsLink[] = parsed.map((p, i) => ({
            id: `bulk-${now}-${i}`,
            url: p.url,
            title: p.title,
            preview: p.preview,
            ts: now,
          }));
          set((s) => ({
            newsLinks: [...entries, ...s.newsLinks].slice(0, 80),
            pipelineLog: [
              {
                layer: "data",
                kind: "news.import",
                message: `Import ${entries.length} link từ khối văn bản`,
                ts: Date.now(),
              } satisfies PipelineLogEntry,
              ...get().pipelineLog,
            ].slice(0, MAX_LOG),
          }));
          return entries.length;
        },

        clearPersistedDemoData: () => {
          if (typeof window !== "undefined") {
            localStorage.removeItem(STORAGE_KEY);
          }
          if (timer) {
            clearInterval(timer);
            timer = null;
          }
          const prices = seedPrices();
          const keys = Object.keys(prices);
          set({
            rotateIndex: 0,
            prices,
            positions: [{ symbol: "VNM", qty: 100, avgCost: 62 }],
            watchlist: ["FPT", "VCB"],
            newsLinks: [],
            ticks: [],
            insights: [],
            commQueue: [],
            pipelineLog: [],
            liveFeedConnected: false,
            lastWsMessage: null,
            autoTickerOn: false,
            toast: null,
            selectedSymbol: keys[0] ?? null,
          });
        },

        setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),

        clearLog: () => set({ pipelineLog: [], toast: null }),

        dismissToast: () => set({ toast: null }),

        setLiveFeedConnected: (v) => set({ liveFeedConnected: v }),

        processWsPayload: (payload) => {
          const s = get();
          if (
            payload &&
            typeof payload === "object" &&
            (payload as { type?: string }).type === "tick" &&
            typeof (payload as { symbol?: string }).symbol === "string" &&
            typeof (payload as { price?: number }).price === "number"
          ) {
            const p = payload as {
              symbol: string;
              price: number;
              volume?: number;
            };
            const result = ingestExternalTick({
              symbol: p.symbol,
              price: p.price,
              volume: typeof p.volume === "number" ? p.volume : undefined,
              prices: s.prices,
              positions: s.positions,
            });
            const toastItem = result.deliveries.find((x) => x.target === "toast");
            set({
              prices: result.prices,
              ticks: [result.tick, ...s.ticks].slice(0, MAX_TICKS),
              insights: [...result.insights, ...s.insights].slice(0, 40),
              commQueue: [...result.deliveries, ...s.commQueue].slice(0, 60),
              pipelineLog: [...result.logs, ...s.pipelineLog].slice(0, MAX_LOG),
              lastWsMessage: `ws tick ${p.symbol}`,
              toast: toastItem ? `${toastItem.title}\n${toastItem.body}` : s.toast,
            });
            return;
          }

          const line =
            typeof payload === "object" && payload !== null
              ? JSON.stringify(payload).slice(0, 220)
              : String(payload).slice(0, 220);
          set({
            lastWsMessage: line,
            pipelineLog: [
              {
                layer: "data",
                kind: "ws.message",
                message: line,
                ts: Date.now(),
              } satisfies PipelineLogEntry,
              ...get().pipelineLog,
            ].slice(0, MAX_LOG),
          });
        },
      };
    },
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        newsLinks: s.newsLinks,
        positions: s.positions,
        watchlist: s.watchlist,
        selectedSymbol: s.selectedSymbol,
        prices: s.prices,
        rotateIndex: s.rotateIndex,
      }),
      skipHydration: true,
    },
  ),
);
