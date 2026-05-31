# Finance Buddy Demo — Checklist tiến độ

> Cập nhật: **31/05/2026** (merge `main` + `main_macos`)  
> Mục đích: theo dõi những gì **đã làm**, **đang dở**, **chưa làm** — theo tính năng, luồng logic, dữ liệu, giao diện.  
> Đối chiếu spec sản phẩm: [`struct.md`](../struct.md) · Hướng dẫn chạy: [`README.md`](../README.md)

---

## Tóm tắt nhanh

| Hạng mục | Tiến độ ước lượng | Ghi chú |
|----------|-------------------|---------|
| Kiến trúc 3 layer + orchestration | **~90%** (demo) | Data → Intelligence → Communication đã nối; chưa AI/OpenAI |
| State & persistence | **~85%** | Redux Toolkit + `localStorage`; migrate từ Zustand xong |
| Dashboard chính (`/`) | **~88%** | Bảng giá, TradingView chart, risk panel, inday offline |
| Trang sản phẩm Insight (`/insight`) | **~80%** | Pipeline insight theo sổ, risk engine VaR/drawdown |
| Dữ liệu VPS thật (Tauri) | **~85%** | Universe + bảng giá + TV history (cache session) |
| Chart / phân tích kỹ thuật | **~75%** | TradingView dark, toolbar đo, RSI/MA demo signal |
| AI / Python / Kafka / Redis | **~20%** | FinRAG `/bctc` → Rust/Tauri + SQLite + Ollama + Gemini |
| Giao diện dashboard & shell | **~85%** | AppNav, design tokens, toolbar chuyên nghiệp |
| Mobile bridge / OS notification | **~35%** | UI panel `commQueue`; queue RAM, chưa gửi mobile thật |
| Dev tooling (port, CSS, Tauri dev) | **~85%** | Auto port, sync `devUrl`, fix bootstrap/Tailwind cache |
| Design system / taste-skill | **~55%** | Skill gốc + `finance-buddy-design`; token CSS, AppNav, `fb-board` trên VPS/SQLite |

**Ký hiệu:** `[x]` xong · `[~]` một phần · `[ ]` chưa làm

---

## 1. Kiến trúc & quy ước code

| # | Hạng mục | Trạng thái | Chi tiết |
|---|----------|------------|----------|
| 1.1 | Phân tách layer theo `struct.md` §5.6 | [x] | `src/lib/layers/{data,intelligence,communication,shared}/` |
| 1.2 | Orchestrator duy nhất | [x] | `src/lib/orchestration/pipeline.ts` — `pushDemoTick`, `ingestExternalTick` |
| 1.3 | Quy tắc import một chiều | [x] | data → intelligence → communication |
| 1.4 | Redux Toolkit thay Zustand | [x] | `demoSlice`, `store`, `hooks`; xóa `demo-store.ts`, `StoreRehydrate` |
| 1.5 | Next.js static export cho Tauri | [x] | `output: "export"` chỉ khi **production build** → `out/`; dev không bật export (tránh lỗi bootstrap) |
| 1.6 | Spec sản phẩm đầy đủ | [x] | `struct.md` — vision, persona, stack mục tiêu |
| 1.7 | SQLite / backend Node riêng | [~] | SQLite embedded Tauri (stocks, FinRAG); chưa backend Node riêng |
| 1.8 | Dev: tự chọn port + đồng bộ Tauri | [x] | `scripts/pick-port.mjs`, `next-dev.mjs`, `desktop-dev.mjs`, `tauri.dev.conf.json` |
| 1.9 | Design skill + token UI chuyên nghiệp | [~] | `.agents/skills/design-taste-frontend`, `.cursor/skills/finance-buddy-design`, `AppNav`, `globals.css` tokens |

---

## 2. Data Layer

### 2.1 Nguồn dữ liệu

| # | Hạng mục | Trạng thái | Chi tiết / file |
|---|----------|------------|-----------------|
| 2.1.1 | Giá mock (5 mã) | [x] | `seedPrices`, `nextTick` — `src/lib/layers/data/index.ts` |
| 2.1.2 | Tick nội bộ (rotate symbol) | [x] | `pushDemoTick` trong pipeline |
| 2.1.3 | Tick WebSocket ngoài | [x] | `ingestExternalTick` + `server/demo-ws.mjs` |
| 2.1.4 | API VPS — danh sách mã | [x] | Rust `vps_get_list_all_stock` → `parseUniverseJson` |
| 2.1.5 | API VPS — giá nhiều mã | [x] | Rust `vps_get_stock_data` → `parseStockRowsJson`, chunk 42 mã |
| 2.1.6 | API VPS — TradingView history | [x] | Rust + UI: `fetchChartBars`, LW/TV chart, chỉ báo panel |
| 2.1.7 | Realtime streaming VPS | [ ] | Chỉ poll/batch một lần; không websocket VPS |
| 2.1.8 | `test_data_inday/` (HOSE, VN30) | [x] | `public/data/inday/*.json`, `loadIndayBoard`, nút HOSE/VN30 offline |
| 2.1.9 | `data_config/` (stock, market) | [ ] | Metadata sàn/chỉ số — **chưa import vào app** |

### 2.2 Danh mục & watchlist

| # | Hạng mục | Trạng thái | Chi tiết |
|---|----------|------------|----------|
| 2.2.1 | Portfolio mặc định (VNM) | [x] | `demoSlice` initial state |
| 2.2.2 | Import portfolio demo (3 mã) | [x] | Nút trên dashboard |
| 2.2.3 | Watchlist mặc định | [x] | FPT, VCB |
| 2.2.4 | Watchlist lưu nhiều bộ (VPS board) | [x] | `savedWatchlists`, CRUD trên `VpsPriceBoard` |
| 2.2.5 | Import portfolio từ file/CSV | [ ] | Chưa có |
| 2.2.6 | Đa danh mục (broker) — data model | [~] | `DEMO_BOOKS` tĩnh; chỉ sổ `own` sync Redux |

### 2.3 Tin tức

| # | Hạng mục | Trạng thái | Chi tiết |
|---|----------|------------|----------|
| 2.3.1 | Lưu link tin (demo crawl) | [x] | `fakeNewsLinks` — title có mã VNM/FPT để test lọc |
| 2.3.2 | Thêm clip thủ công (url/title/preview) | [x] | `NewsClipPanel`, `addNewsClip` |
| 2.3.3 | Import bulk (nhiều dòng) | [x] | `parseNewsImportBlock`, `importNewsBulkThunk` |
| 2.3.4 | Copy link / preview | [x] | Clipboard trong panel |
| 2.3.5 | Crawl thật (HTTP/scraper) | [ ] | Chỉ demo |
| 2.3.6 | Lọc tin theo danh mục | [x] | Checkbox "Chỉ tin liên quan PF" — `NewsClipPanel` |
| 2.3.7 | AI tóm tắt tin | [ ] | Chưa có |

### 2.4 Lưu trữ

| # | Hạng mục | Trạng thái | Chi tiết |
|---|----------|------------|----------|
| 2.4.1 | `localStorage` — giá, portfolio, tin, watchlist, filter bảng | [x] | Key `finance-buddy-demo-v1`, debounce subscribe |
| 2.4.2 | RAM only — tick, insight, log, comm queue | [x] | Cố ý — F5 mất session pipeline |
| 2.4.3 | VPS board cache sau refresh | [ ] | `vpsBoardBySymbol` không persist |
| 2.4.4 | SQLite qua Tauri | [x] | Stocks, indices seed; FinRAG tables; TV history cache |

---

## 3. Intelligence Layer

| # | Hạng mục | Trạng thái | Chi tiết |
|---|----------|------------|----------|
| 3.1 | Rule: ảnh hưởng danh mục khi \|Δ%\| ≥ 2 | [x] | `evaluateTickAgainstPortfolio` |
| 3.2 | Rule: concentration risk | [x] | max weight ≥ 38% + biến động |
| 3.3 | Rule: drawdown portfolio ≤ −5% | [x] | Cảnh báo rủi ro demo |
| 3.4 | P/L & concentration helpers | [x] | `portfolioPnL`, `concentrationRisk` |
| 3.5 | Risk score UI (insight page) | [x] | `computeRiskScore`, drawdown-aware |
| 3.5b | Risk engine (rust-finance port) | [x] | `src/lib/risk/` — VaR, drawdown, correlation, rebalance |
| 3.6 | Scenario stress (HPG −30%) | [x] | `pricesForBook` — sổ `scenario-hpg` |
| 3.7 | Insight theo từng sổ danh mục | [x] | `activeBookId` Redux, pipeline + filter `/insight` |
| 3.8 | Phân tích nhóm ngành | [ ] | Chưa có |
| 3.9 | Rebalance suggestion | [ ] | Chỉ gợi ý text trong struct |
| 3.10 | OpenAI / NL explanation | [~] | `summarizeInsightForAiStub` hiển thị trên insight cards (`SymbolDetailPanel`); chưa gọi API |
| 3.11 | Expected profit/loss | [ ] | Chưa có |

---

## 4. Communication Layer

| # | Hạng mục | Trạng thái | Chi tiết |
|---|----------|------------|----------|
| 4.1 | Insight → toast | [x] | `insightToDeliveries` → toast Redux |
| 4.2 | Insight → mobile-bridge queue | [x] | `commQueue` trong RAM |
| 4.2b | UI panel mobile-bridge | [x] | `MobileBridgePanel.tsx` — hiển thị hàng đợi, `clearCommQueue` |
| 4.3 | Pipeline log (data/intelligence/communication) | [x] | Badge màu trên dashboard, max 80 dòng |
| 4.4 | Gửi mobile / push thật | [ ] | Chưa có channel 1-1 |
| 4.5 | OS notification (Tauri) | [ ] | IPC demo chỉ `app_ping` |
| 4.6 | Báo cáo / biểu đồ gửi khách (broker) | [ ] | Chưa có |

---

## 5. Luồng logic chính

### 5.1 Pipeline tick (mock / WS)

```
[Nút Tick / Auto ticker / WS demo-server]
        ↓
  Data: market.tick (+ cập nhật prices)
        ↓
  Intelligence: evaluateTickAgainstPortfolio → Insight[]
        ↓
  Communication: insightToDeliveries → toast + mobile-bridge
        ↓
  Redux: ticks, insights, commQueue, pipelineLog, toast
```

| # | Bước | Trạng thái |
|---|------|------------|
| 5.1.1 | Tick thủ công | [x] |
| 5.1.2 | Auto ticker (~1.4s dashboard, ~1.6s insight) | [x] |
| 5.1.3 | WS `type: "tick"` → cùng downstream | [x] |
| 5.1.4 | WS message khác → chỉ log | [x] |
| 5.1.5 | Tick VPS realtime → intelligence | [ ] | Giá VPS không đi qua pipeline insight |

### 5.2 Luồng VPS (desktop)

```
[Nút Giá VPS / Tải bảng VPS]
        ↓
  invoke (Tauri) → Rust reqwest → bgapidatafeed.vps.com.vn
        ↓
  Parse JSON → vpsUniverse, vpsBoardBySymbol, vpsSymbolOrder
        ↓
  (subset) merge vào prices cho portfolio/watchlist
        ↓
  VpsPriceBoard: lọc HOSE/VN30/HNX/..., ngành, search, watchlist
```

| # | Bước | Trạng thái |
|---|------|------------|
| 5.2.1 | Chặn invoke trên browser thuần | [x] | Báo lỗi rõ — cần `desktop:dev` |
| 5.2.2 | Tải full board (universe + chunk) | [x] | `loadVpsFullBoard` |
| 5.2.3 | Cập nhật giá subset (portfolio) | [x] | `fetchVpsStockData` |
| 5.2.4 | Chart từ histdatafeed | [x] | `fetchChartBars` + cache session; TradingView datafeed legacy API |

### 5.3 Luồng tin tức

| # | Bước | Trạng thái |
|---|------|------------|
| 5.3.1 | Demo crawl → newsLinks | [x] |
| 5.3.2 | Import bulk → merge + log data | [x] |
| 5.3.3 | Tin → intelligence (liên kết mã) | [~] | Lọc tin theo mã PF trên UI; chưa rule insight từ tin |

---

## 6. Giao diện (UI)

### 6.1 Dashboard `/` — `DemoDashboard`

| # | Thành phần | Trạng thái | File |
|---|------------|------------|------|
| 6.1.1 | Header + badge WS | [x] | Toolbar `fb-toolbar-btn`, WS font-data |
| 6.1.1b | AppNav thống nhất | [x] | `AppNav.tsx` — Bảng giá / Danh mục / BCTC / Crawl |
| 6.1.2 | Theme Sáng / Tối / Auto | [x] | `ThemeToggle` trên AppNav |
| 6.1.3 | Lưới bảng giá + chi tiết mã (~1.42:0.4) | [x] | `MarketBoardTable`, `SymbolDetailPanel` |
| 6.1.4 | Bảng giá VPS (full HOSE-style) | [x] | `VpsPriceBoard.tsx` |
| 6.1.5 | Chỉ báo MA20, RSI (OHLCV thật) | [x] | `ChartsIndicatorsPanel`, `ChartAnalysisPanel`, `chart/indicators.ts` |
| 6.1.5b | TradingView Advanced Charts (mặc định) | [x] | `TradingViewChart`, dark UI, measure toolbar, `load-tradingview.ts` |
| 6.1.5c | Cache OHLCV — 1 API call / mã | [x] | `loadChartBarsFull` trong `bars.ts` |
| 6.1.6 | Panel tin | [x] | `NewsClipPanel.tsx` |
| 6.1.7 | Pipeline log | [x] | Trong dashboard |
| 6.1.7b | Mobile bridge panel | [x] | `MobileBridgePanel.tsx` dưới chart/tin |
| 6.1.8 | Nút điều khiển demo | [x] | Tick, auto, import portfolio, tin, VPS |
| 6.1.9 | Link sang `/insight` | [x] | "Demo sản phẩm" |
| 6.1.10 | Ping Rust (IPC) | [x] | `DesktopPing.tsx` |
| 6.1.12 | Risk panel + toast dashboard | [x] | `DashboardRiskPanel`, toast `risk` khi WARN/HALT |

### 6.2 Trang FinRAG `/bctc` — AI đọc báo cáo tài chính

| # | Thành phần | Trạng thái | File |
|---|------------|------------|------|
| 6.2.0 | Tab Hỏi đáp + Báo cáo/upload | [x] | `src/app/bctc/page.tsx`, `src/components/finrag/*` |
| 6.2.0b | FinRAG Rust `src-tauri/src/finrag/*` + IPC | [x] | SQLite, Ollama embed, Gemini chat |
| 6.2.0d | Client `src/lib/finrag/client.ts` | [x] | `invoke` Tauri only — không Node server |
| 6.2.0c | Link từ dashboard & insight nav | [x] | `DemoDashboard`, `FireAntTopNav` |

### 6.3 Trang Insight `/insight` — FireAnt-style

| # | Thành phần | Trạng thái | File |
|---|------------|------------|------|
| 6.2.1 | Shell layout tối | [x] | `FireAntInsightShell.tsx`, `fireant.css` |
| 6.2.2 | Top nav | [x] | `FireAntTopNav.tsx` |
| 6.2.3 | Index strip | [x] | `FireAntIndexStrip.tsx` |
| 6.2.4 | Main grid — sổ / holdings / insight | [x] | `FireAntMainGrid.tsx` |
| 6.2.5 | Panel sổ danh mục | [x] | `FireAntBookPanel.tsx` |
| 6.2.6 | Right rail | [x] | `FireAntRightRail.tsx` |
| 6.2.7 | Đa danh mục (own / client / scenario) | [x] | `demoBooks.ts` |
| 6.2.8 | Tự tải VPS board khi Tauri | [x] | `useEffect` trong shell |
| 6.2.9 | Insight feed gắn đúng sổ đang chọn | [x] | `bookId` trên Insight, `filterInsightsForBook`, snapshot khi đổi sổ |
| 6.2.10 | Chart / order book thật | [ ] | Chưa |

### 6.4 VPS Price Board — tính năng UI

| # | Tính năng | Trạng thái |
|---|-----------|------------|
| 6.3.1 | Tab sàn: ALL, HOSE, VN30, HNX, HNX30, UPCOM | [x] |
| 6.3.2 | Lọc ngành | [x] |
| 6.3.3 | Tìm mã | [x] |
| 6.3.4 | Màu trần/sàn/tăng/giảm TC | [x] | `toneMatch`, `fmtVi` |
| 6.3.5 | Chọn mã → `selectedSymbol` | [x] |
| 6.3.6 | Watchlist lưu / xóa | [x] |
| 6.3.7 | Refresh / loading / error state | [x] |

---

## 7. Desktop (Tauri + Rust)

| # | Hạng mục | Trạng thái | Chi tiết |
|---|----------|------------|----------|
| 7.1 | Shell Tauri 2.x | [x] | `src-tauri/` |
| 7.2 | `app_ping` IPC | [x] | `src/lib/desktop/ipc.ts` |
| 7.3 | VPS module Rust | [x] | `src-tauri/src/vps.rs` |
| 7.4 | Header curl khớp DevTools | [x] | Doc `docs/vps-api-curl.md` |
| 7.5 | `scripts/tauri-path.js` (PATH cargo Windows) | [x] | README ghi chú |
| 7.5b | Auto port dev + Tauri `devUrl` | [x] | `scripts/desktop-dev.mjs` merge `tauri.dev.conf.json`; `.dev-port` |
| 7.6 | File system / notification OS | [ ] | Backlog |
| 7.7 | Build installer | [~] | Script có; phụ thuộc môi trường VS Build Tools |

---

## 8. Dữ liệu tham chiếu (ngoài runtime app)

| Thư mục / file | Mục đích | Đã tích hợp app? |
|----------------|----------|------------------|
| `test_data_inday/hose_data.js` | Snapshot intraday HOSE (403 mã) | **Có** → `public/data/inday/hose.json` |
| `test_data_inday/vn30_data.js` | Snapshot VN30 (30 mã) | **Có** → `public/data/inday/vn30.json` |
| `data_config/stock.js` | Metadata mã (~21k dòng) | **Chưa** |
| `data_config/market.js` | Chỉ số / sàn | **Chưa** |
| `docs/vps-api-curl.md` | Đối chiếu API VPS ↔ Rust | Tham chiếu dev |

**Gợi ý bước tiếp:** import có chọn lọc (VN30 trước) làm fallback offline khi không có Tauri / API lỗi.

---

## 9. So với vision `struct.md` (chưa là, backlog)

### 9.1 Core product (mục tiêu dài hạn)

- [ ] Realtime engine Node/Kafka
- [ ] Python signal / feature engineering
- [ ] OpenAI: tóm tắt tin, giải thích alert, portfolio review
- [ ] Redis cache
- [ ] Extension data connector (user consent)
- [ ] Smart alert theo ngữ cảnh (đầy đủ — hiện mới rule demo)
- [ ] PC ↔ Mobile channel thật
- [ ] Broker: auto report, trigger call
- [~] Risk dashboard nâng cao (expected loss, rebalance) | VaR/CVaR/rebalance hints trên `/insight`; chưa kill-switch Tauri |

### 9.2 Ưu tiên gần (đề xuất)

1. [x] Áp dụng `.font-data` + `fb-board` lên `VpsPriceBoard`, `AllStocksBoard`
2. [x] Gắn `vps_get_tradingview_history` → chart thật thay `chart-mock`
3. [x] Import `test_data_inday` làm mock offline / test
4. [x] Insight pipeline theo `activeBook` trên `/insight`
5. [ ] Poll VPS định kỳ hoặc WS nếu có nguồn
6. [ ] Persist cache bảng VPS (optional SQLite)
7. [ ] Tauri notification khi insight severity `risk`

---

## 10. Khó khăn & rủi ro đã gặp

| # | Khó khăn | Mức | Ghi chú / hướng xử lý |
|---|----------|-----|------------------------|
| 10.1 | **CORS** — browser không gọi trực tiếp VPS | Cao | Giải bằng Rust/Tauri; web thuần không có giá VPS |
| 10.2 | **Tải full universe** — hàng nghìn mã, nhiều request chunk | Trung bình | Chunk 42; chậm lần đầu; cần cache / lazy load |
| 10.3 | **API VPS không chính thức** — header Origin/Referer, có thể đổi | Trung bình | Giữ `vps-api-curl.md`; theo dõi breaking change |
| 10.4 | **Next static export** — không `next start` | Thấp | Export chỉ lúc `npm run build`; dev tắt export (fix bootstrap script) |
| 10.5 | **Windows build Rust** — thiếu `link.exe` | Trung bình | Cần VS Build Tools; doc trong README |
| 10.6 | **Hai mặt sản phẩm** — dashboard bảng giá vs insight “không phải broker app” | Trung bình | `/` demo data; `/insight` demo positioning — cần narrative rõ khi demo khách |
| 10.7 | **Insight vs danh mục đa sổ** — pipeline một Redux `positions` | Thấp | Đã refactor: `activeBookId`, `resolveBookContext`, giá scenario HPG |
| 10.8 | **Dữ liệu offline lớn** — `stock.js` 21k dòng chưa dùng | Thấp | Cân nhắc JSON gzip / lazy import / chỉ subset |
| 10.9 | **Không realtime VPS** — giá snapshot | Trung bình | UX “bảng giá” vs “insight timing” chưa khớp spec realtime |
| 10.10 | **AI layer** — chưa có backend bảo mật API key | — | Blocker cho tóm tắt tin / NL insight |
| 10.11 | **Tailwind/CSS 404** — cache `.next` hỏng | Thấp | Xóa `.next` + restart dev; mở rộng `tailwind.config` content `./src/**/*` |
| 10.12 | **Port 3000 bận** — Tauri trỏ sai URL | Thấp | Đã fix: `pick-port` + overlay `devUrl`; ghi `.dev-port` |

---

## 11. Cách chạy & kiểm tra nhanh

```bash
# Web (tự chọn port trống từ 3000 — xem URL in ra terminal / file .dev-port)
npm install && npm run dev

# WS demo (terminal khác)
npm run demo-server                 # ws://127.0.0.1:3456

# Desktop + VPS (port Next và Tauri devUrl đồng bộ tự động)
npm run desktop:dev               # Cần Rust + Tauri

# Nếu CSS/Tailwind không load: pkill -f "next dev"; rm -rf .next && npm run dev
```

**Checklist smoke test:**

- [ ] F5 — portfolio/tin còn (`localStorage`)
- [ ] Tick → log 3 layer + toast + **mobile bridge panel**
- [ ] Bật auto ticker
- [ ] `demo-server` → badge WS xanh, tick từ WS
- [ ] Desktop: Giá VPS / Tải bảng VPS
- [ ] `/insight` — đổi sổ, xem risk score, scenario HPG
- [ ] Import tin bulk + copy link
- [ ] Lọc tin theo PF + insight có dòng AI stub
- [ ] `desktop:dev` khi port 3000 bận — app vẫn mở đúng port

---

## 12. Lịch sử thay đổi lớn (để nhớ context)

| Thời điểm (ước) | Việc đã làm |
|-----------------|-------------|
| Ban đầu | Template 3 layer, mock tick, Zustand |
| Gần đây | Migrate **Redux Toolkit**; persist debounce |
| Gần đây | **Tauri + VPS Rust** (3 endpoint); bảng giá full |
| Gần đây | Trang **`/insight`** FireAnt-style, đa danh mục demo |
| Gần đây | Watchlist, filter sàn/ngành trên VPS board |
| Gần đây | **FinRAG `/bctc`**, TradingView/Lightweight chart, SQLite stocks |
| **30/05/2026** | **Mobile bridge panel**, AI stub UI, lọc tin theo PF |
| **30/05/2026** | Fix **Next bootstrap** (export chỉ production), **Tailwind/cache `.next`** |
| **30/05/2026** | **Auto port** (`scripts/next-dev.mjs`, `desktop-dev.mjs`) + sync Tauri `devUrl` |
| **30/05/2026** | **design-taste-frontend** skill + `finance-buddy-design`, AppNav, token CSS cockpit |
| **30/05/2026** | **Chart OHLCV thật** — `ChartsIndicatorsPanel` gọi `fetchChartBars` (VPS/SQLite/JSON), xóa `chart-mock.ts` |
| **30/05/2026** | **Inday offline** — `test_data_inday` → JSON, `loadIndayBoard`, nút HOSE/VN30 trên dashboard |
| **30/05/2026** | **Insight theo sổ** — `activeBookId`, pipeline book-scoped, snapshot khi đổi sổ `/insight` |
| **31/05/2026** | **Merge `main_macos`** — risk engine, insight by book, inday JSON, AppNav, auto port |
| **31/05/2026** | **TradingView** — legacy getBars fix, session cache, TA signal panel, script loader |

### 9.3 Có thể phát triển tiếp (sau merge)

1. [ ] FinRAG: upload PDF thật, seed corpus BCTC, env `GEMINI_API_KEY` trong Tauri
2. [ ] Poll VPS định kỳ / websocket giá (tránh snapshot cũ)
3. [ ] Persist cache bảng VPS + chart vào SQLite
4. [ ] Tauri OS notification khi insight `risk` / kill-switch
5. [ ] MACD/Bollinger trên chart; disclaimer tín hiệu TA trên UI
6. [ ] AI nghiên cứu thị trường + DCF (`docs/ai_plan.md` mục 2–3)
7. [ ] Import subset `data_config/stock.js` cho metadata ngành
8. [ ] Mobile bridge gửi push thật (không chỉ queue RAM)

---

*File này nên cập nhật khi hoàn thành mục backlog hoặc sau mỗi sprint demo.*
