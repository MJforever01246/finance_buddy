# Finance Buddy — demo template

Template minh họa cấu trúc trong `struct.md`: **Data → Intelligence → Communication**, log pipeline, WebSocket demo, và **Tauri** bọc UI (static export).

## Giao diện

- Theme **Sáng / Tối / Auto** (kiểu bảng giá web CK): toggle trên header.
- **Bảng giá + chi tiết mã** dùng lưới cố định (tỉ lệ ~1.42 : 0.4 trên màn `xl`) để layout không vỡ.
- **Chỉ báo & biểu đồ** (MA20, RSI demo) và **Tin** (lưu clip, import nhiều dòng, preview, copy link).

## Dữ liệu lưu ở đâu?

- **SQLite (embedded)** — database file tại `%APPDATA%/com.financebuddy.demo/data.db`. Được bundle vào binary Rust, user không cần cài thêm gì. Lần đầu chạy app sẽ tự tạo DB và seed dữ liệu cơ bản (1940 mã CK + 26 chỉ số thị trường từ `data_config/`).
- **Giá mock, danh mục, watchlist, danh sách tin** được đồng bộ vào **`localStorage`** (key `finance-buddy-demo-v1`) qua **Redux Toolkit** store (subscribe debounce) — F5 vẫn còn.
- **Tick, insight, log pipeline, hàng đợi comm** chỉ nằm trong **RAM** (Redux), refresh là mất (cố ý để log nhẹ).
- **Giá VPS (thật)** trong app desktop: Next gọi `invoke('vps_get_stock_data', …)` → Rust `reqwest` tới API công khai VPS (không cần proxy Node CORS). Nút **Giá VPS** trên dashboard; trình duyệt `next dev` không có invoke sẽ báo cần Tauri.

### SQLite commands (IPC từ frontend)

| Command | Mô tả |
|---------|--------|
| `db_get_market_indices` | Lấy danh sách chỉ số thị trường |
| `db_get_stocks` | Tìm mã CK (filter exchange, stockType, search) |
| `db_get_stock_by_symbol` | Lấy chi tiết 1 mã |
| `db_count_stocks` | Đếm tổng số mã |

Frontend helper: `src/lib/desktop/db.ts`.

## Chạy web (trình duyệt)

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

## Chạy desktop (Tauri)

Cần [Rust](https://www.rust-lang.org/tools/install) (rustup). Trên Windows cần thêm **[Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)** với workload **Desktop development with C++** — nếu thiếu, build Rust sẽ báo `linker link.exe not found`.

Sau khi cài, **`cargo`** nên chạy được (`cargo --version`). Nếu terminal báo không tìm thấy `cargo` nhưng có file `%USERPROFILE%\.cargo\bin\cargo.exe`, các lệnh `npm run desktop:*` dùng `scripts/tauri-path.js` để prepend PATH; có thể thêm `%USERPROFILE%\.cargo\bin` vào PATH hệ thống để mọi terminal đều thấy `cargo`.

Lần đầu: `npm install`.

```bash
npm run desktop:dev
```

Lệnh này chạy Next dev server và mở cửa sổ desktop trỏ `http://localhost:3000`.

Build installer / bundle:

```bash
npm run desktop:build
```

Next được build static vào `out/`; Tauri đọc `out/` theo `src-tauri/tauri.conf.json`.

## Thử các nút

- **Bước tick tiếp theo** — Data → rule Intelligence → Communication (toast + mobile-bridge).
- **Bật auto ticker** — tick định kỳ.
- **Import portfolio demo** — portfolio lớn hơn để insight dễ bật.
- **Lưu tin (demo crawl)** — ghi vào danh sách tin (Data).
- **Giá VPS** — chỉ trong Tauri: cập nhật `prices` từ API VPS qua Rust.

## WebSocket (tùy chọn)

```bash
npm run demo-server
```

UI kết nối `ws://127.0.0.1:3456`. Payload `type: "tick"` đi qua **cùng orchestration** với tick nội bộ (`ingestExternalTick` → Intelligence → Communication). Các message khác chỉ ghi `ws.message` trong log.

## IPC (Tauri)

Trong app desktop, nút **Ping Rust** gọi `invoke('app_ping')`; logic bọc trong `src/lib/desktop/ipc.ts`. Lệnh Rust: `src-tauri/src/lib.rs` + `vps.rs` (`vps_get_list_all_stock`, `vps_get_stock_data`, `vps_get_tradingview_history`).

## Cấu trúc code (theo layer)

Xem chi tiết trong **`struct.md` § 5.6**. Tóm tắt:

- `src/lib/layers/data/` — Data Layer  
- `src/lib/layers/intelligence/` — Intelligence Layer  
- `src/lib/layers/communication/` — Communication Layer  
- `src/lib/layers/shared/` — types chung  
- `src/lib/orchestration/` — ghép pipeline (vd `pipeline.ts`)  
- `src/stores/` — Redux Toolkit (`demoSlice`, `store`, hooks)  
- `src-tauri/` — shell desktop  

### Ghi chú build Next

Dự án dùng `output: "export"` phục vụ Tauri — không dùng `next start` cho bản static; bundle desktop lấy file từ `out/`.
