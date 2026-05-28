# VPS Datafeed — tham chiếu curl ↔ Rust (`vps.rs`)

File này lưu **đúng ba lệnh curl** bạn cung cấp để sau này đối chiếu với code (không phụ thuộc lịch sử chat).  
Implementation hiện tại: `src-tauri/src/vps.rs` — `reqwest` blocking, TLS `rustls`.

---

## 1) Danh sách tất cả mã — `getlistallstock`

**Rust:** `vps_get_list_all_stock()` → `GET https://bgapidatafeed.vps.com.vn/getlistallstock`

```bash
curl 'https://bgapidatafeed.vps.com.vn/getlistallstock' \
  -H 'Accept: application/json, text/plain, */*' \
  -H 'Accept-Language: en-US,en;q=0.9,vi;q=0.8' \
  -H 'Cache-Control: no-cache' \
  -H 'Connection: keep-alive' \
  -H 'Origin: https://banggia.vps.com.vn' \
  -H 'Pragma: no-cache' \
  -H 'Referer: https://banggia.vps.com.vn/' \
  -H 'Sec-Fetch-Dest: empty' \
  -H 'Sec-Fetch-Mode: cors' \
  -H 'Sec-Fetch-Site: same-site' \
  -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36' \
  -H 'sec-ch-ua: "Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "Windows"'
```

---

## 2) Giá nhiều mã — `getliststockdata/{SYMBOLS_CSV}`

**Rust:** `vps_get_stock_data(symbols)` → `GET https://bgapidatafeed.vps.com.vn/getliststockdata/{symbols}`  
`symbols`: chuỗi CSV, ví dụ `ACB,BID,CTG` (không khoảng thừa; code Rust có `.replace(' ', "")`).

```bash
curl 'https://bgapidatafeed.vps.com.vn/getliststockdata/ACB,BID,CTG,DGC,FPT,GAS,GVR,HDB,HPG,LPB,MBB,MSN,MWG,PLX,SAB,SHB,SSB,SSI,STB,TCB,TPB,VCB,VHM,VIB,VIC,VJC,VNM,VPB,VPL,VRE' \
  -H 'Accept: application/json, text/plain, */*' \
  -H 'Accept-Language: en-US,en;q=0.9,vi;q=0.8' \
  -H 'Cache-Control: no-cache' \
  -H 'Connection: keep-alive' \
  -H 'Origin: https://banggia.vps.com.vn' \
  -H 'Pragma: no-cache' \
  -H 'Referer: https://banggia.vps.com.vn/' \
  -H 'Sec-Fetch-Dest: empty' \
  -H 'Sec-Fetch-Mode: cors' \
  -H 'Sec-Fetch-Site: same-site' \
  -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36' \
  -H 'sec-ch-ua: "Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "Windows"'
```

---

## 3) Lịch sử TradingView — `histdatafeed` + query

**Rust:** `vps_get_tradingview_history(symbol, resolution, from_sec, to_sec, countback?)`  
→ `GET https://histdatafeed.vps.com.vn/tradingview/history?symbol=…&resolution=…&from=…&to=…&countback=…`  
`countback`: optional; nếu không gửi từ FE, Rust mặc định **330** (như curl mẫu).

```bash
curl 'https://histdatafeed.vps.com.vn/tradingview/history?symbol=ACB&resolution=1D&from=1737158400&to=1777939200&countback=330' \
  -H 'Accept: */*' \
  -H 'Accept-Language: en-US,en;q=0.9,vi;q=0.8' \
  -H 'Cache-Control: no-cache' \
  -H 'Connection: keep-alive' \
  -H 'Origin: https://chart.vps.com.vn' \
  -H 'Pragma: no-cache' \
  -H 'Referer: https://chart.vps.com.vn/' \
  -H 'Sec-Fetch-Dest: empty' \
  -H 'Sec-Fetch-Mode: cors' \
  -H 'Sec-Fetch-Site: same-site' \
  -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36' \
  -H 'sec-ch-ua: "Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "Windows"'
```

---

## Bảng đối chiếu nhanh

| curl | Rust (`vps.rs`) |
|------|------------------|
| `GET …/getlistallstock` + header banggia | `vps_get_list_all_stock` + `headers_banggia()` |
| `GET …/getliststockdata/{csv}` + header banggia | `vps_get_stock_data` + cùng header |
| `GET …/tradingview/history?…` + header chart | `vps_get_tradingview_history` + `headers_chart()` + query (có `countback`) |
| `User-Agent` Chrome 147 | `Client::builder().user_agent(...)` + header map (đồng bộ UA) |

**Ghi chú:** `reqwest` không gửi “hàng TCP `Connection: keep-alive`” như trình duyệt; có thể bỏ hoặc để client tự quản. Các header `Sec-*`, `sec-ch-ua*` được mirror để gần với curl bạn bắt được từ DevTools.

---

## Frontend / IPC

- Next gọi `invoke('vps_get_list_all_stock')`, `invoke('vps_get_stock_data', { symbols: '...' })`, `invoke('vps_get_tradingview_history', { symbol, resolution, fromSec, toSec, countback })` (camelCase theo serde mặc định Tauri 2 — **cần kiểm tra** tên tham số camelCase trong `invoke`; Rust dùng `snake_case`, Tauri thường map `from_sec` ↔ `fromSec`).
