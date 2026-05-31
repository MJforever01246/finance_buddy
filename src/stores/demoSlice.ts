import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type {
  CommDelivery,
  Insight,
  LayerId,
  MarketTick,
  PipelineLogEntry,
  Position,
  SavedNewsLink,
} from "@/lib/layers/types";
import { fetchIndaySnapshot, type IndayDataset } from "@/lib/inday/loadIndaySnapshot";
import { parseNewsImportBlock } from "@/lib/news-import";
import { resolveBookContext } from "@/lib/insight/bookMetrics";
import { DEMO_BOOKS, isDemoBookId } from "@/lib/insight/demoBooks";
import { portfolioPnL } from "@/lib/layers/data";
import { buildPortfolioRiskReport } from "@/lib/risk/report";
import { isTauriRuntime } from "@/lib/tauri-env";
import { fetchLastClosePrices } from "@/lib/portfolio/fetchPrices";
import {
  mergePortfolioLines,
  mergePositions,
  parsePortfolioBlock,
  type ParsedPortfolioLine,
} from "@/lib/portfolio/parsePortfolio";
import { portfolioTotals } from "@/lib/portfolio/metrics";
import { buildSymbolCsv, normalizeVpsQuotesJson } from "@/lib/vps/normalize";
import { parseStockRowsJson } from "@/lib/vps/parseVpsBoard";
import { parseUniverseJson } from "@/lib/vps/parseUniverse";
import type { VpsBoardRow, VpsStockMeta } from "@/lib/vps/types";
import {
  fakeNewsLinks,
  ingestExternalTick,
  pushDemoTick,
  seedPrices,
} from "@/lib/orchestration/pipeline";

export const STORAGE_KEY = "finance-buddy-demo-v1";
const MAX_LOG = 80;
const MAX_TICKS = 24;

export type BoardMarketTab =
  | "ALL"
  | "HOSE"
  | "VN30"
  | "HNX"
  | "HNX30"
  | "UPCOM";

const BOARD_TABS: BoardMarketTab[] = [
  "ALL",
  "HOSE",
  "VN30",
  "HNX",
  "HNX30",
  "UPCOM",
];

export type SavedWatchlist = {
  id: string;
  name: string;
  symbols: string[];
};

export type DemoSliceState = {
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
  toastKind: "insight" | "risk" | "info" | null;
  selectedSymbol: string | null;
  vpsLoading: boolean;
  vpsError: string | null;
  vpsUniverse: VpsStockMeta[];
  vpsBoardBySymbol: Record<string, VpsBoardRow>;
  vpsSymbolOrder: string[];
  boardMarketTab: BoardMarketTab;
  boardIndustryFilter: string;
  boardSearch: string;
  boardWatchlistId: string;
  savedWatchlists: SavedWatchlist[];
  /** Sổ danh mục đang chọn trên `/insight` — pipeline insight đánh giá theo sổ này */
  activeBookId: string;
  /** Đỉnh NAV theo sổ — drawdown (rust-finance DrawdownMonitor) */
  riskPeakByBook: Record<string, number>;
};

export function getInitialDemoState(): DemoSliceState {
  const prices = seedPrices();
  const keys = Object.keys(prices);
  return {
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
    toastKind: null,
    selectedSymbol: keys[0] ?? null,
    vpsLoading: false,
    vpsError: null,
    vpsUniverse: [],
    vpsBoardBySymbol: {},
    vpsSymbolOrder: [],
    boardMarketTab: "ALL",
    boardIndustryFilter: "",
    boardSearch: "",
    boardWatchlistId: "ALL",
    savedWatchlists: [],
    activeBookId: "own",
    riskPeakByBook: {},
  };
}

export function loadPersisted(): Partial<DemoSliceState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<DemoSliceState>;
  } catch {
    return null;
  }
}

export function pickPersist(s: DemoSliceState) {
  return {
    newsLinks: s.newsLinks,
    positions: s.positions,
    watchlist: s.watchlist,
    selectedSymbol: s.selectedSymbol,
    prices: s.prices,
    rotateIndex: s.rotateIndex,
    savedWatchlists: s.savedWatchlists,
    boardWatchlistId: s.boardWatchlistId,
    boardMarketTab: s.boardMarketTab,
    boardIndustryFilter: s.boardIndustryFilter,
    boardSearch: s.boardSearch,
    activeBookId: s.activeBookId,
  };
}

export function mergeHydrated(
  base: DemoSliceState,
  p: Partial<DemoSliceState>,
): DemoSliceState {
  const savedWatchlists = Array.isArray(p.savedWatchlists)
    ? p.savedWatchlists
    : base.savedWatchlists;
  let boardWatchlistId =
    typeof p.boardWatchlistId === "string"
      ? p.boardWatchlistId
      : base.boardWatchlistId;
  if (
    boardWatchlistId !== "ALL" &&
    !savedWatchlists.some((w) => w.id === boardWatchlistId)
  ) {
    boardWatchlistId = "ALL";
  }
  return {
    ...base,
    newsLinks: Array.isArray(p.newsLinks) ? p.newsLinks : base.newsLinks,
    positions: Array.isArray(p.positions) ? p.positions : base.positions,
    watchlist: Array.isArray(p.watchlist) ? p.watchlist : base.watchlist,
    selectedSymbol:
      p.selectedSymbol !== undefined ? p.selectedSymbol : base.selectedSymbol,
    prices:
      p.prices && typeof p.prices === "object"
        ? { ...base.prices, ...p.prices }
        : base.prices,
    rotateIndex:
      typeof p.rotateIndex === "number" ? p.rotateIndex : base.rotateIndex,
    savedWatchlists,
    boardWatchlistId,
    boardMarketTab:
      p.boardMarketTab !== undefined &&
      BOARD_TABS.includes(p.boardMarketTab as BoardMarketTab)
        ? (p.boardMarketTab as BoardMarketTab)
        : base.boardMarketTab,
    boardIndustryFilter:
      typeof p.boardIndustryFilter === "string"
        ? p.boardIndustryFilter
        : base.boardIndustryFilter,
    boardSearch:
      typeof p.boardSearch === "string" ? p.boardSearch : base.boardSearch,
    activeBookId:
      typeof p.activeBookId === "string" && isDemoBookId(p.activeBookId)
        ? p.activeBookId
        : base.activeBookId,
  };
}

function touchBookPeaks(state: DemoSliceState) {
  for (const book of DEMO_BOOKS) {
    const ctx = resolveBookContext(book.id, state.positions, state.prices);
    const { market } = portfolioPnL(ctx.positions, ctx.prices);
    const prev = state.riskPeakByBook[book.id] ?? market;
    state.riskPeakByBook[book.id] = Math.max(prev, market);
  }
}

function riskAlertsToInsights(
  bookId: string,
  alerts: ReturnType<typeof buildPortfolioRiskReport>["alerts"],
  symbols: string[],
): Insight[] {
  return alerts.map((a) => ({
    id: `ins-risk-${a.code}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: a.title,
    detail: a.detail,
    severity: a.severity,
    relatedSymbols: symbols,
    ts: Date.now(),
    bookId,
  }));
}

function bookPipelineFromState(d: DemoSliceState) {
  return resolveBookContext(d.activeBookId, d.positions, d.prices);
}

export const pushManualTick = createAsyncThunk(
  "demo/pushManualTick",
  (_, { getState }) => {
    const d = (getState() as { demo: DemoSliceState }).demo;
    const ctx = bookPipelineFromState(d);
    return pushDemoTick({
      prices: d.prices,
      positions: ctx.positions,
      rotateIndex: d.rotateIndex,
      bookId: ctx.bookId,
      bookLabel: ctx.bookLabel,
      rotateSymbols: ctx.rotateSymbols,
    });
  },
);

export const fetchVpsStockData = createAsyncThunk(
  "demo/fetchVpsStockData",
  async (symbolsArg: string | undefined, { getState, rejectWithValue }) => {
    if (!isTauriRuntime()) {
      return rejectWithValue(
        "Chạy bằng desktop:dev (Tauri) để gọi API VPS từ Rust; trình duyệt không có invoke.",
      );
    }
    const demo = (getState() as { demo: DemoSliceState }).demo;
    const symbols =
      symbolsArg?.trim() ||
      buildSymbolCsv(demo.positions, demo.watchlist);
    if (!symbols) {
      return rejectWithValue("Không có mã để hỏi.");
    }
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<string>("vps_get_stock_data", { symbols });
    } catch (e) {
      return rejectWithValue(
        e instanceof Error ? e.message : String(e ?? "invoke lỗi"),
      );
    }
  },
);

const STOCK_DATA_CHUNK = 42;

export const loadIndayBoard = createAsyncThunk(
  "demo/loadIndayBoard",
  async (dataset: IndayDataset, { rejectWithValue }) => {
    try {
      return await fetchIndaySnapshot(dataset);
    } catch (e) {
      return rejectWithValue(
        e instanceof Error ? e.message : String(e ?? "Lỗi tải snapshot offline"),
      );
    }
  },
);

export const importPortfolioWithPrices = createAsyncThunk(
  "demo/importPortfolioWithPrices",
  async (
    arg: {
      text?: string;
      positions?: ParsedPortfolioLine[];
      mode: "replace" | "merge";
    },
    { rejectWithValue },
  ) => {
    const parsed = arg.positions?.length
      ? {
          positions: mergePortfolioLines(arg.positions),
          errors: [] as string[],
          skipped: 0,
        }
      : parsePortfolioBlock(arg.text ?? "");
    if (!parsed.positions.length) {
      return rejectWithValue(
        parsed.errors[0] ?? "Không parse được dòng danh mục hợp lệ.",
      );
    }

    const syms = parsed.positions.map((p) => p.symbol);
    const csv = syms.join(",");
    let priceUpdates: Record<string, number> = {};

    if (isTauriRuntime()) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const raw = await invoke<string>("vps_get_stock_data", { symbols: csv });
        priceUpdates = normalizeVpsQuotesJson(raw);
        const boardChunk = parseStockRowsJson(raw);
        for (const [sym, row] of Object.entries(boardChunk)) {
          if (row.matchP > 0) priceUpdates[sym] = row.matchP;
        }
      } catch {
        /* fallback OHLCV bên dưới */
      }
    }

    const missing = syms.filter((s) => !(priceUpdates[s] && priceUpdates[s] > 0));
    if (missing.length) {
      const fallback = await fetchLastClosePrices(missing);
      priceUpdates = { ...priceUpdates, ...fallback };
    }

    return {
      positions: parsed.positions,
      mode: arg.mode,
      priceUpdates,
      parseErrors: parsed.errors,
      skipped: parsed.skipped,
    };
  },
);

export const loadVpsFullBoard = createAsyncThunk(
  "demo/loadVpsFullBoard",
  async (_, { rejectWithValue }) => {
    if (!isTauriRuntime()) {
      return rejectWithValue(
        "Chạy bằng desktop:dev (Tauri) để tải bảng VPS (invoke + Rust).",
      );
    }
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const allRaw = await invoke<string>("vps_get_list_all_stock");
      const universe = parseUniverseJson(allRaw);
      const symbolOrder = universe.map((u) => u.sym).filter(Boolean);
      if (!symbolOrder.length) {
        return rejectWithValue(
          "Không parse được danh sách mã từ getlistallstock.",
        );
      }
      const board: Record<string, VpsBoardRow> = {};
      for (let i = 0; i < symbolOrder.length; i += STOCK_DATA_CHUNK) {
        const csv = symbolOrder.slice(i, i + STOCK_DATA_CHUNK).join(",");
        const raw = await invoke<string>("vps_get_stock_data", {
          symbols: csv,
        });
        Object.assign(board, parseStockRowsJson(raw));
      }
      return { universe, board, symbolOrder };
    } catch (e) {
      return rejectWithValue(
        e instanceof Error ? e.message : String(e ?? "invoke lỗi"),
      );
    }
  },
);

const demoSlice = createSlice({
  name: "demo",
  initialState: getInitialDemoState(),
  reducers: {
    resetToInitial: () => getInitialDemoState(),

    mergeImportedNews: (state, action: PayloadAction<SavedNewsLink[]>) => {
      const entries = action.payload;
      state.newsLinks = [...entries, ...state.newsLinks].slice(0, 80);
      state.pipelineLog = [
        {
          layer: "data" as LayerId,
          kind: "news.import",
          message: `Import ${entries.length} link từ khối văn bản`,
          ts: Date.now(),
        },
        ...state.pipelineLog,
      ].slice(0, MAX_LOG);
    },

    toggleAutoTicker: (state) => {
      state.autoTickerOn = !state.autoTickerOn;
    },

    importPortfolioDemo: (state) => {
      state.positions = [
        { symbol: "VNM", qty: 200, avgCost: 60000 },
        { symbol: "FPT", qty: 80, avgCost: 112000 },
        { symbol: "VCB", qty: 40, avgCost: 58000 },
      ];
      state.pipelineLog = [
        {
          layer: "data" as LayerId,
          kind: "portfolio.import",
          message: "Import demo 3 mã — Data Layer",
          ts: Date.now(),
        },
        ...state.pipelineLog,
      ].slice(0, MAX_LOG);
      touchBookPeaks(state);
    },

    importPortfolio: (
      state,
      action: PayloadAction<{
        positions: Position[];
        mode: "replace" | "merge";
      }>,
    ) => {
      state.positions = mergePositions(
        state.positions,
        action.payload.positions,
        action.payload.mode,
      );
      touchBookPeaks(state);
    },

    createWatchlistFromPortfolio: (
      state,
      action: PayloadAction<{ name?: string }>,
    ) => {
      const symbols = Array.from(
        new Set(state.positions.map((p) => p.symbol.toUpperCase())),
      );
      if (!symbols.length) return;
      const name = action.payload.name?.trim() || "Danh mục hiện tại";
      const id = `wl-${Date.now()}`;
      state.savedWatchlists.push({ id, name, symbols });
      state.boardWatchlistId = id;
      state.pipelineLog = [
        {
          layer: "data" as LayerId,
          kind: "watchlist.from-portfolio",
          message: `Watchlist «${name}» từ ${symbols.length} mã danh mục`,
          ts: Date.now(),
        },
        ...state.pipelineLog,
      ].slice(0, MAX_LOG);
    },

    addNewsDemo: (state) => {
      const links = fakeNewsLinks(2);
      state.newsLinks = [...links, ...state.newsLinks].slice(0, 80);
      state.pipelineLog = [
        {
          layer: "data" as LayerId,
          kind: "news.saved",
          message: `Lưu ${links.length} link tin (demo crawl)`,
          ts: Date.now(),
        },
        ...state.pipelineLog,
      ].slice(0, MAX_LOG);
    },

    addNewsClip: (
      state,
      action: PayloadAction<{
        url: string;
        title: string;
        preview?: string;
      }>,
    ) => {
      const item = action.payload;
      const entry: SavedNewsLink = {
        id: `clip-${Date.now()}`,
        url: item.url.trim(),
        title: item.title.trim() || item.url.slice(0, 48),
        preview: item.preview?.trim(),
        ts: Date.now(),
      };
      state.newsLinks = [entry, ...state.newsLinks].slice(0, 80);
      state.pipelineLog = [
        {
          layer: "data" as LayerId,
          kind: "news.clip",
          message: `Lưu link: ${entry.title.slice(0, 60)}`,
          ts: Date.now(),
        },
        ...state.pipelineLog,
      ].slice(0, MAX_LOG);
    },

    setSelectedSymbol: (state, action: PayloadAction<string | null>) => {
      state.selectedSymbol = action.payload;
    },

    setBoardMarketTab: (state, action: PayloadAction<BoardMarketTab>) => {
      state.boardMarketTab = action.payload;
    },

    setBoardIndustryFilter: (state, action: PayloadAction<string>) => {
      state.boardIndustryFilter = action.payload;
    },

    setBoardSearch: (state, action: PayloadAction<string>) => {
      state.boardSearch = action.payload;
    },

    setBoardWatchlistId: (state, action: PayloadAction<string>) => {
      state.boardWatchlistId = action.payload;
    },

    setActiveBookId: (state, action: PayloadAction<string>) => {
      if (!isDemoBookId(action.payload)) return;
      state.activeBookId = action.payload;
      touchBookPeaks(state);
      const ctx = resolveBookContext(
        state.activeBookId,
        state.positions,
        state.prices,
      );
      const { market } = portfolioPnL(ctx.positions, ctx.prices);
      const peak = state.riskPeakByBook[state.activeBookId] ?? market;
      const report = buildPortfolioRiskReport({
        positions: ctx.positions,
        prices: ctx.prices,
        peakEquity: peak,
      });
      const snapshot = riskAlertsToInsights(
        ctx.bookId,
        report.alerts,
        ctx.positions.map((p) => p.symbol),
      );
      if (snapshot.length) {
        state.insights = [...snapshot, ...state.insights].slice(0, 40);
        state.pipelineLog = [
          {
            layer: "intelligence" as LayerId,
            kind: "risk.book-snapshot",
            message: `Risk «${ctx.bookLabel}» — ${snapshot.length} cảnh báo`,
            ts: Date.now(),
          },
          ...state.pipelineLog,
        ].slice(0, MAX_LOG);
      }
    },

    createSavedWatchlist: (
      state,
      action: PayloadAction<{ name: string; symbols: string[] }>,
    ) => {
      const name = action.payload.name.trim() || "Watchlist";
      const symbols = Array.from(
        new Set(
          action.payload.symbols.map((s) => s.trim().toUpperCase()).filter(Boolean),
        ),
      );
      const id = `wl-${Date.now()}`;
      state.savedWatchlists.push({ id, name, symbols });
      state.boardWatchlistId = id;
      state.pipelineLog = [
        {
          layer: "data" as LayerId,
          kind: "watchlist.created",
          message: `Tạo watchlist "${name}" (${symbols.length} mã)`,
          ts: Date.now(),
        },
        ...state.pipelineLog,
      ].slice(0, MAX_LOG);
    },

    deleteSavedWatchlist: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.savedWatchlists = state.savedWatchlists.filter((w) => w.id !== id);
      if (state.boardWatchlistId === id) state.boardWatchlistId = "ALL";
    },

    addSymbolToWatchlist: (
      state,
      action: PayloadAction<{ watchlistId: string; symbol: string }>,
    ) => {
      const { watchlistId, symbol } = action.payload;
      const sym = symbol.trim().toUpperCase();
      const wl = state.savedWatchlists.find((w) => w.id === watchlistId);
      if (wl && sym && !wl.symbols.includes(sym)) {
        wl.symbols.push(sym);
      }
    },

    removeSymbolFromWatchlist: (
      state,
      action: PayloadAction<{ watchlistId: string; symbol: string }>,
    ) => {
      const { watchlistId, symbol } = action.payload;
      const wl = state.savedWatchlists.find((w) => w.id === watchlistId);
      if (wl) {
        wl.symbols = wl.symbols.filter((s) => s !== symbol);
      }
    },

    clearLog: (state) => {
      state.pipelineLog = [];
      state.toast = null;
      state.toastKind = null;
    },

    dismissToast: (state) => {
      state.toast = null;
      state.toastKind = null;
    },

    setToast: (
      state,
      action: PayloadAction<{ message: string; kind?: "insight" | "risk" | "info" }>,
    ) => {
      state.toast = action.payload.message;
      state.toastKind = action.payload.kind ?? "info";
    },

    clearCommQueue: (state) => {
      state.commQueue = [];
    },

    setLiveFeedConnected: (state, action: PayloadAction<boolean>) => {
      state.liveFeedConnected = action.payload;
    },

    processWsPayload: (state, action: PayloadAction<unknown>) => {
      const payload = action.payload;
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
        const ctx = bookPipelineFromState(state);
        const result = ingestExternalTick({
          symbol: p.symbol,
          price: p.price,
          volume: typeof p.volume === "number" ? p.volume : undefined,
          prices: state.prices,
          positions: ctx.positions,
          bookId: ctx.bookId,
          bookLabel: ctx.bookLabel,
        });
        const toastItem = result.deliveries.find((x) => x.target === "toast");
        state.prices = result.prices;
        touchBookPeaks(state);
        state.ticks = [result.tick, ...state.ticks].slice(0, MAX_TICKS);
        state.insights = [...result.insights, ...state.insights].slice(0, 40);
        state.commQueue = [...result.deliveries, ...state.commQueue].slice(
          0,
          60,
        );
        state.pipelineLog = [...result.logs, ...state.pipelineLog].slice(
          0,
          MAX_LOG,
        );
        state.lastWsMessage = `ws tick ${p.symbol}`;
        if (toastItem) {
          state.toast = `${toastItem.title}\n${toastItem.body}`;
          state.toastKind = "insight";
        }
        return;
      }

      const line =
        typeof payload === "object" && payload !== null
          ? JSON.stringify(payload).slice(0, 220)
          : String(payload).slice(0, 220);
      state.lastWsMessage = line;
      state.pipelineLog = [
        {
          layer: "data" as LayerId,
          kind: "ws.message",
          message: line,
          ts: Date.now(),
        },
        ...state.pipelineLog,
      ].slice(0, MAX_LOG);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(pushManualTick.fulfilled, (state, { payload: result }) => {
        const toastItem = result.deliveries.find((x) => x.target === "toast");
        state.rotateIndex = result.rotateIndex;
        state.prices = result.prices;
        touchBookPeaks(state);
        state.ticks = [result.tick, ...state.ticks].slice(0, MAX_TICKS);
        state.insights = [...result.insights, ...state.insights].slice(0, 40);
        state.commQueue = [...result.deliveries, ...state.commQueue].slice(
          0,
          60,
        );
        state.pipelineLog = [...result.logs, ...state.pipelineLog].slice(
          0,
          MAX_LOG,
        );
        if (toastItem) {
          state.toast = `${toastItem.title}\n${toastItem.body}`;
          state.toastKind = "insight";
        }
      })
      .addCase(fetchVpsStockData.pending, (state) => {
        state.vpsLoading = true;
        state.vpsError = null;
      })
      .addCase(fetchVpsStockData.fulfilled, (state, action) => {
        state.vpsLoading = false;
        const boardChunk = parseStockRowsJson(action.payload);
        Object.assign(state.vpsBoardBySymbol, boardChunk);
        const map = normalizeVpsQuotesJson(action.payload);
        const n = Object.keys(map).length;
        state.prices = { ...state.prices, ...map };
        for (const [sym, row] of Object.entries(boardChunk)) {
          if (row.matchP > 0) state.prices[sym] = row.matchP;
        }
        state.pipelineLog = [
          {
            layer: "data" as LayerId,
            kind: "vps.quotes",
            message: n ? `Cập nhật ${n} mã từ VPS` : "VPS trả về — không parse được giá",
            ts: Date.now(),
          },
          ...state.pipelineLog,
        ].slice(0, MAX_LOG);
      })
      .addCase(fetchVpsStockData.rejected, (state, action) => {
        state.vpsLoading = false;
        state.vpsError =
          typeof action.payload === "string"
            ? action.payload
            : String(action.error.message ?? "Lỗi VPS");
      })
      .addCase(loadVpsFullBoard.pending, (state) => {
        state.vpsLoading = true;
        state.vpsError = null;
      })
      .addCase(loadVpsFullBoard.fulfilled, (state, action) => {
        state.vpsLoading = false;
        state.vpsUniverse = action.payload.universe;
        state.vpsBoardBySymbol = action.payload.board;
        state.vpsSymbolOrder = action.payload.symbolOrder;
        const nBoard = Object.keys(action.payload.board).length;
        for (const [sym, row] of Object.entries(action.payload.board)) {
          if (row.matchP > 0) state.prices[sym] = row.matchP;
        }
        touchBookPeaks(state);
        state.pipelineLog = [
          {
            layer: "data" as LayerId,
            kind: "vps.board",
            message: `Tải bảng: ${action.payload.universe.length} mã danh sách, ${nBoard} dòng giá parse được`,
            ts: Date.now(),
          },
          ...state.pipelineLog,
        ].slice(0, MAX_LOG);
      })
      .addCase(loadVpsFullBoard.rejected, (state, action) => {
        state.vpsLoading = false;
        state.vpsError =
          typeof action.payload === "string"
            ? action.payload
            : String(action.error.message ?? "Lỗi tải bảng VPS");
      })
      .addCase(loadIndayBoard.pending, (state) => {
        state.vpsLoading = true;
        state.vpsError = null;
      })
      .addCase(loadIndayBoard.fulfilled, (state, action) => {
        state.vpsLoading = false;
        state.vpsUniverse = action.payload.universe;
        state.vpsBoardBySymbol = action.payload.board;
        state.vpsSymbolOrder = action.payload.symbolOrder;
        if (action.payload.dataset === "vn30") {
          state.boardMarketTab = "VN30";
        } else if (state.boardMarketTab === "VN30") {
          state.boardMarketTab = "HOSE";
        }
        const nBoard = Object.keys(action.payload.board).length;
        for (const [sym, row] of Object.entries(action.payload.board)) {
          if (row.matchP > 0) state.prices[sym] = row.matchP;
        }
        touchBookPeaks(state);
        const label = action.payload.dataset === "hose" ? "HOSE" : "VN30";
        state.pipelineLog = [
          {
            layer: "data" as LayerId,
            kind: "inday.snapshot",
            message: `Snapshot offline ${label}: ${nBoard} mã · ${action.payload.tradingDate || "—"}`,
            ts: Date.now(),
          },
          ...state.pipelineLog,
        ].slice(0, MAX_LOG);
        state.toast = `Đã tải snapshot ${label} (${nBoard} mã)`;
        state.toastKind = "info";
      })
      .addCase(loadIndayBoard.rejected, (state, action) => {
        state.vpsLoading = false;
        state.vpsError =
          typeof action.payload === "string"
            ? action.payload
            : String(action.error.message ?? "Lỗi snapshot offline");
      })
      .addCase(importPortfolioWithPrices.pending, (state) => {
        state.vpsLoading = true;
        state.vpsError = null;
      })
      .addCase(importPortfolioWithPrices.fulfilled, (state, action) => {
        state.vpsLoading = false;
        const { positions, mode, priceUpdates } = action.payload;
        state.positions = mergePositions(state.positions, positions, mode);
        state.prices = { ...state.prices, ...priceUpdates };
        touchBookPeaks(state);

        const totals = portfolioTotals(state.positions, state.prices);
        const pnlSign = totals.pnlAbs >= 0 ? "+" : "";
        state.toast = [
          `Import ${positions.length} mã`,
          `Giá trị ${Math.round(totals.market / 1e6)}M`,
          `L/L ${pnlSign}${totals.pnlPct.toFixed(1)}%`,
        ].join(" · ");
        state.toastKind = "info";

        state.pipelineLog = [
          {
            layer: "data" as LayerId,
            kind: "portfolio.import",
            message: `Import ${positions.length} mã (${mode}) · NAV ${Math.round(totals.market).toLocaleString("vi-VN")} · L/L ${pnlSign}${totals.pnlPct.toFixed(1)}%`,
            ts: Date.now(),
          },
          ...state.pipelineLog,
        ].slice(0, MAX_LOG);
      })
      .addCase(importPortfolioWithPrices.rejected, (state, action) => {
        state.vpsLoading = false;
        state.vpsError =
          typeof action.payload === "string"
            ? action.payload
            : String(action.error.message ?? "Lỗi import danh mục");
      });
  },
});

export const demoReducer = demoSlice.reducer;
export const {
  resetToInitial,
  toggleAutoTicker,
  importPortfolioDemo,
  importPortfolio,
  createWatchlistFromPortfolio,
  addNewsDemo,
  addNewsClip,
  setSelectedSymbol,
  clearLog,
  dismissToast,
  setToast,
  clearCommQueue,
  setLiveFeedConnected,
  processWsPayload,
  setBoardMarketTab,
  setBoardIndustryFilter,
  setBoardSearch,
  setBoardWatchlistId,
  setActiveBookId,
  createSavedWatchlist,
  deleteSavedWatchlist,
  addSymbolToWatchlist,
  removeSymbolFromWatchlist,
} = demoSlice.actions;

export const importNewsBulkThunk = createAsyncThunk(
  "demo/importNewsBulk",
  async (text: string, { dispatch }) => {
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
    dispatch(demoSlice.actions.mergeImportedNews(entries));
    return entries.length;
  },
);

export const clearPersistedDemoData = createAsyncThunk(
  "demo/clearPersisted",
  async (_, { dispatch }) => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
    dispatch(demoSlice.actions.resetToInitial());
  },
);
