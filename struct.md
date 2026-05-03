# 🚀 Personal Investment Intelligence App (Tauri + Next.js)

---

# 🧠 1. PRODUCT OVERVIEW

## 🎯 Mục tiêu

Xây dựng ứng dụng:

> **Trợ lý đầu tư cá nhân – phân tích danh mục, hiểu ngữ cảnh thị trường và nhắc hành động đúng lúc**

---

## 🧩 Định vị sản phẩm

KHÔNG phải:
- App chứng khoán (SSI, VPS…)
- Tool chart (TradingView)
- Data tool (FireAnt)

👉 MÀ LÀ:

> **Intelligence Layer = Data → Insight → Action**

---

## 👥 Target Users

- Retail (nhà đầu tư cá nhân)
- Broker (môi giới)
- Advanced / Risk-focused users

---

# 📦 2. CORE FEATURES

---

## 🟢 2.1 Data Layer (Cơ bản)

- Dữ liệu thị trường realtime
- Watchlist
- Import danh mục đầu tư
- Crawl + lưu tin tức local
- Lưu link tin tức

---

## 🟡 2.2 Intelligence Layer (Cốt lõi)

### 📊 Phân tích thị trường
- Phân tích mã cổ phiếu
- Phân tích nhóm ngành
- Đánh giá tiềm năng (rule-based / AI)

---

### 💼 Quản lý danh mục
- Lãi/lỗ realtime
- Expected profit/loss
- Phân bổ danh mục
- Gợi ý cơ cấu (rebalance)

---

### ⚠️ Risk Analysis
- Risk score danh mục
- Concentration risk
- Drawdown tracking
- Alert theo rủi ro (không chỉ giá)

---

## 🔵 2.3 Personal Communication Layer (KHÁC BIỆT CHÍNH)

### 🔗 PC ↔ Mobile (1-1 channel)

- Gửi:
  - Báo cáo
  - Biểu đồ
  - Tin tức
- Notification realtime

---

### 🔔 Smart Alert System

Không chỉ:
- giá tăng/giảm

Mà:
- “Ảnh hưởng đến danh mục”
- “Rủi ro tăng”
- “Có dòng tiền vào mạnh”

---

### 📰 Smart News

- Crawl tin
- Lọc theo danh mục user
- Tóm tắt (AI)

---

# 🎯 3. KEY DIFFERENTIATION

## ❗ So với FireAnt

| FireAnt | App của bạn |
|--------|-------------|
| Alert giá | Alert theo context |
| Dữ liệu | Insight |
| Chart | Story |
| Chung | Cá nhân hoá |

---

## ❗ So với App chứng khoán

| Broker App | App của bạn |
|------------|-------------|
| Đặt lệnh | Không |
| Bảng giá | Không |
| Margin | Không |
| Insight | Có |

---

👉 Bạn = **Decision Support Layer**

---

# 👥 4. USER-BASED FEATURES

---

## 🟡 Retail

### Features:
- Portfolio insight:
  - “Danh mục bạn đang rủi ro”
- Smart alert:
  - “Mã X ảnh hưởng Y% danh mục”
- News cá nhân hoá + AI summary

---

## 🔵 Broker

### Features:
- Client portfolio tracking
- Auto report gửi khách
- Trigger call:
  - “Khách A đang lỗ 5% mã X”

---

## 🔴 Risk User

### Features:
- Risk dashboard realtime
- Expected loss
- Rebalance suggestion
- Risk alert

---

# 🏗️ 5. TECH ARCHITECTURE

---

## 🔁 Tổng thể
[Next.js UI]
↕ (IPC / invoke)
[Tauri Core (Rust)]
↕
[Local Backend (Node.js)]
↕
[AI Layer / Python / OpenAI]
↕
[Optional: Kafka / Redis]


---

## 🧩 5.1 Frontend Layer

- Next.js (React)
- WebSocket client
- State:
  - Zustand / Redux

---

## 🧩 5.2 Desktop Layer

- Tauri (Rust)
- IPC bridge:
  - invoke()
- OS integration:
  - file
  - notification

---

## 🧩 5.3 Backend Local (Realtime Engine)

- Node.js
- WebSocket server
- Data processing nhẹ
- Rule-based signal engine

---

## 🧩 5.4 AI Layer (QUAN TRỌNG)

### 🎯 Mục tiêu
- Biến data → insight → hành động

---

### 🔧 Thành phần

#### 1. Rule-based Engine
- Alert logic:
  - price
  - volume
  - portfolio impact

---

#### 2. Python Processing (optional)
- pandas
- phân tích dữ liệu
- feature engineering

---

#### 3. OpenAI Integration

Sử dụng OpenAI API cho:

### 🧠 Use cases:

#### a. News Summarization
- Tóm tắt tin tức
- Rút ra ý chính

---

#### b. Insight Generation
- “Mã này có nên mua không?”
- “Danh mục đang có vấn đề gì?”

---

#### c. Natural Language Explanation
- Chuyển:
  - data kỹ thuật
→ thành:
  - ngôn ngữ dễ hiểu

---

#### d. Alert Explanation
- Không chỉ alert
- mà giải thích:
  - “vì sao”

---

#### e. Portfolio Review
- Phân tích:
  - điểm mạnh/yếu
  - đề xuất hành động

---

### 🔌 Cách tích hợp

- Backend gọi API OpenAI
- Cache kết quả (Redis nếu cần)
- Trả về UI qua WebSocket

---

## 🧩 5.5 Realtime Pipeline (Advanced)
Market Data
→ Node.js collector
→ Kafka
→ Python (signal)
→ OpenAI (insight)
→ Redis (cache)
→ WebSocket server
→ App


---

## 🧩 5.6 Quy ước thư mục code (demo repo)

Mục tiêu: **mỗi layer có một “nhà” riêng**, tránh file trùng chức năng và import chéo lung tung (logic Data nằm ở hai nơi, sửa một chỗ quên chỗ kia).

### Cây thư mục chính (ánh xạ Product Layer → folder)

| Layer / vai trò trong doc | Thư mục trong repo | Được phép làm gì |
|---------------------------|--------------------|------------------|
| **Shared contracts** (DTO, enums log layer) | `src/lib/layers/shared/` | Chỉ định nghĩa **kiểu dữ liệu** chung (vd `types.ts`). Không chứa luồng nghiệp vụ. |
| **2.1 Data Layer** | `src/lib/layers/data/` | Thu thập / giả lập giá, tin, import portfolio… **Không** import `intelligence/` hay `communication/`. |
| **2.2 Intelligence Layer** | `src/lib/layers/intelligence/` | Rule / scoring / insight từ dữ liệu & portfolio. Được import `@/lib/layers/data` và `shared`. **Không** import `communication/`. |
| **2.3 Communication Layer** | `src/lib/layers/communication/` | Biến insight → toast / push / bridge copy. Chỉ import `shared` (+ kiểu `Insight`). **Không** import ngược `data/` để “tự lấy giá”. |
| **Ghép pipeline (Product flow)** | `src/lib/orchestration/` | **Chỗ duy nhất** được xếp chuỗi `data → intelligence → communication` (vd `pipeline.ts`). Tránh nhân đôi luồng này ở component hoặc store. |
| **UI / Frontend** | `src/app/`, `src/components/` | Route + hiển thị; gọi store, hooks, hoặc hàm orchestration đã bọc sẵn. **Không** nhét rule insight/trọng số danh mục trực tiếp vào JSX nếu đã có chỗ trong `layers/intelligence`. |
| **Client state** | `src/stores/` | Zustand (hoặc tương đương): giữ session UI, gọi orchestration / adapter IPC. Không duplicate lại toàn bộ logic trong `layers/*`. |
| **Desktop IPC (UI → Rust)** | `src/lib/desktop/` | Bọc `invoke`, phát hiện môi trường Tauri. **Không** chứa rule Data/Intelligence — chỉ bridge tới `src-tauri` (sau: file, notification). |
| **Desktop shell** | `src-tauri/` | Rust + Tauri: cửa sổ, lệnh `#[tauri::command]`. Không logic insight. |
| **Realtime demo (Node)** | `server/` | WS/test backend tách khỏi React; sau có thể thay bằng engine thật. |

### Quy tắc phụ thuộc (để không sửa file chéo nhau)

1. **Một chiều**: `data` → `intelligence` → `communication`. Không import ngược hướng.
2. **Một orchestrator**: `src/lib/orchestration/` là nơi **duy nhất** ghép ba layer: tick nội bộ (`pushDemoTick`), tick từ Node/WebSocket (`ingestExternalTick`), v.v. Component / bridge **không** tự gọi `evaluate…` + `insightToDeliveries` lẻ tẻ.
3. **Realtime → cùng pipeline**: dữ liệu từ `server/` (WebSocket) khi vào UI phải đi qua orchestration (cùng downstream Intelligence → Communication với tick mock), tránh hai luồng insight lệch nhau.
4. **Không nhân bản**: không tạo thêm `*-layer.ts` nằm lẻ ngoài `layers/<tên>/` cho cùng một trách nhiệm — tránh hai file sửa lệch nhau.
5. **Types**: đặt contract ở `layers/shared/`; có thể re-export qua `layers/types.ts` để import ngắn, nhưng **không** định nghĩa trùng interface ở `components/` hay `stores/`.

### Chạy desktop (Tauri + Next)

- Dev: shell Tauri trỏ tới `http://localhost:3000` (`npm run desktop:dev` sau khi cài Rust + deps).
- Build: Next xuất static ra `out/`; Tauri đóng gói `out/` (`npm run desktop:build`). Cần Rust toolchain trên máy build.
- IPC demo: frontend gọi `invoke('app_ping')` — Rust trả chuỗi (mở rộng sau: file, OS notification, v.v.).

---

# 🔌 6. EXTENSION (OPTIONAL)

## ✔ Mục đích:
- Data connector (user consent)

## ❌ Không:
- Intercept API lén
- Phụ thuộc website

---

# 🔥 7. FINAL STACK

- UI: Next.js
- Desktop: Tauri
- Realtime: Node.js (ws)
- AI:
  - Python
  - OpenAI API
- Queue: Kafka (optional)
- Cache: Redis

---

# ✅ KẾT LUẬN

👉 App của bạn không cạnh tranh:
- Data
- Chart

👉 Mà cạnh tranh:

> **Insight + Context + Personalization + Timing**

👉 AI (OpenAI) là lớp nâng cấp giúp:
- hiểu dữ liệu
- giải thích dữ liệu
- hỗ trợ quyết định
