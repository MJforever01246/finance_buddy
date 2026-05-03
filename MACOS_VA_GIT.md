# macOS: chạy dự án & Git (repo mới)

Tài liệu này mô tả **chạy Finance Buddy demo trên macOS** và **khởi tạo Git + đẩy lên remote** (GitHub/GitLab).  
**Lưu ý:** Trước khi `git init` / `git add`, hãy đảm bảo đã có file **`.gitignore`** (trong repo demo đã có sẵn — bỏ qua bước tạo nếu bạn clone từ đây; nếu bắt đầu repo trắng thì tạo `.gitignore` trước).

---

## Phần A — Chuẩn bị trên macOS

1. **Cài Xcode Command Line Tools** (cần cho Rust / một số công cụ build):

   ```bash
   xcode-select --install
   ```

2. **Cài Node.js** (LTS, khuyên dùng nvm hoặc installer từ [nodejs.org](https://nodejs.org/)):

   ```bash
   node -v
   npm -v
   ```

3. **Cài Rust (rustup)** — bắt buộc nếu build Tauri:

   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source "$HOME/.cargo/env"
   rustc -V
   cargo -V
   ```

4. **Vào thư mục dự án** (đường dẫn tùy máy bạn):

   ```bash
   cd /đường/dẫn/tới/finance_buddy/demo
   ```

---

## Phần B — Chạy web (Next.js)

```bash
npm install
npm run dev
```

Mở trình duyệt: [http://localhost:3000](http://localhost:3000).

---

## Phần C — WebSocket demo (tùy chọn, terminal thứ hai)

```bash
npm run demo-server
```

Ứng dụng web sẽ kết nối `ws://127.0.0.1:3456` khi server chạy.

---

## Phần D — Chạy desktop (Tauri)

```bash
npm run desktop:dev
```

Lần đầu Tauri có thể tải dependency Rust khá lâu. Nếu lỗi thiếu thư viện hệ thống, cài đủ **Xcode CLT** và thử lại.

Build bản cài đặt / bundle:

```bash
npm run build
npm run desktop:build
```

---

## Phần E — Git: tạo repo mới (đúng thứ tự, có `.gitignore` trước)

### Bước 1 — Kiểm tra / tạo `.gitignore` **trước** `git add`

- Nếu dự án đã có `.gitignore` (như bản demo): **không cần tạo lại**.
- Nếu bạn tạo repo trống rồi copy code vào: **tạo file `.gitignore` trước**, nội dung tối thiểu nên có:

  - `node_modules/`
  - `.next/`, `out/`
  - `src-tauri/target/`
  - `.env*.local`, `*.log`, `.DS_Store`

Sau đó mới `git add` để tránh đẩy nhầm `node_modules` hoặc build artifact.

### Bước 2 — Khởi tạo Git trong thư mục dự án

```bash
cd /đường/dẫn/tới/finance_buddy/demo
git init
```

### Bước 3 — Kiểm tra nhánh mặc định (tùy Git version)

```bash
git branch -M main
```

### Bước 4 — Stage & commit lần đầu

```bash
git status
git add .
git commit -m "Initial commit: Finance Buddy demo (Next.js + Tauri)"
```

### Bước 5 — Tạo repo trống trên GitHub (hoặc GitLab)

- Vào GitHub → **New repository**.
- Đặt tên (ví dụ `finance-buddy-demo`).
- **Không** tick “Add a README” nếu bạn đã có code local (tránh conflict lần đầu push).
- Tạo xong, copy URL SSH hoặc HTTPS, ví dụ:

  - HTTPS: `https://github.com/<user>/finance-buddy-demo.git`
  - SSH: `git@github.com:<user>/finance-buddy-demo.git`

### Bước 6 — Gắn remote & đẩy code

```bash
git remote add origin git@github.com:<user>/finance-buddy-demo.git
# hoặc: git remote add origin https://github.com/<user>/finance-buddy-demo.git

git push -u origin main
```

Nếu remote đã tồn tại và bạn muốn đổi URL:

```bash
git remote set-url origin <url-mới>
```

### Bước 7 — Xác minh

```bash
git remote -v
git log -1 --oneline
```

Trên GitHub kiểm tra branch `main` đã có commit và **không** có `node_modules/` / `.next/` / `src-tauri/target/` trong repo (nhờ `.gitignore`).

---

## Ghi chú nhanh

- **SSH key trên Mac:** [GitHub — Generating SSH keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent).
- **Tài liệu chung về chạy app:** xem `README.md` trong cùng thư mục dự án.
