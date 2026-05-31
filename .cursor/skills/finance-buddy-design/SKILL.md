---
name: finance-buddy-design
description: >-
  UI/UX cho Finance Buddy — ứng dụng đầu tư & quản lý danh mục CK chuyên nghiệp.
  Dùng khi chỉnh giao diện dashboard, bảng giá, insight, chart, hoặc thêm màn hình mới.
  Kết hợp với skill design-taste-frontend (cockpit density, không landing-page slop).
---

# Finance Buddy — Design (Professional Investment Terminal)

**Design Read:** Ứng dụng quản lý đầu tư CK cho nhà đầu tư cá nhân / môi giới — ngôn ngữ **terminal tin cậy, mật độ cao**, accent xanh lạnh (sky/teal), **không** marketing landing.

## Dials (override taste-skill baseline)

| Dial | Giá trị | Lý do |
|------|---------|--------|
| DESIGN_VARIANCE | 3–4 | Bảng giá cần ổn định, không layout nghệ thuật |
| MOTION_INTENSITY | 2–3 | Chỉ hover/active; không scroll hijack |
| VISUAL_DENSITY | 8–9 | Cockpit: số liệu dày, `font-data`, divider 1px |

## Stack dự án (giữ nguyên)

- Next.js 14 + Tailwind 3 + CSS variables (`src/app/globals.css`)
- Redux Toolkit, không thêm shadcn/Carbon trừ khi user yêu cầu
- Font: **DM Sans** (UI) + **JetBrains Mono** (giá, %, volume)
- Theme: `next-themes` class `dark` — một theme xuyên suốt trang

## Token & class (bắt buộc dùng)

| Token / class | Mục đích |
|---------------|----------|
| `--accent` | CTA chính, link active (sky, không violet AI) |
| `--up` / `--down` | P/L, biến động giá |
| `.fb-panel` | Khối nội dung (border + surface) |
| `.fb-board` | Bảng giá VPS / SQLite — toolbar + table dày |
| `.fb-board-tab` / `--active` | Tab sàn HOSE, VN30… |
| `.font-data` | Mọi số giá, %, khối lượng (cũng trong `.fb-board-td`) |
| `.fb-toolbar-btn` | Nút toolbar dashboard |
| `.fb-nav` | Top navigation thống nhất (`AppNav`) |

## Quy tắc sản phẩm CK

1. **Số liệu trước, copy sau** — headline ngắn; mô tả kỹ thuật để trong `<details>` hoặc README.
2. **Một accent** — sky/teal cho action; xanh/đỏ chỉ cho P/L.
3. **Không card thừa** — bảng giá dùng divider row, không shadow mỗi dòng.
4. **Nav một dòng** — `AppNav`, max ~56px; route: Bảng giá, Danh mục, AI BCTC, Crawl.
5. **Insight / alert** — severity rõ (info / warn / risk); toast góc phải, không modal trừ lỗi nặng.
6. **Desktop-first** — Tauri + VPS; web thuần báo rõ khi thiếu invoke.

## Khi nào đọc `design-taste-frontend`

- Skill gốc: `.agents/skills/design-taste-frontend/SKILL.md`
- **Áp dụng:** §4.4 (density), §4.5 (states), §6 (a11y, reduced motion), §7 VISUAL_DENSITY 8–10
- **Bỏ qua:** hero marketing, bento landing, marquee, GSAP scroll hijack, §13 out-of-scope đã nói dashboard

## Pre-flight (rút gọn)

- [ ] Số giá dùng `.font-data` / tabular-nums
- [ ] Không thêm màu accent thứ hai (tránh violet button tràn trang)
- [ ] Nav + layout dùng `AppNav` / token CSS, không hardcode `#050608` rải rác
- [ ] Dark/light đều đọc được contrast AA
- [ ] Cập nhật `docs/PROGRESS-CHECKLIST.md` khi ship tính năng UI mới
