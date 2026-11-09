# Glass v2 — visual redesign spec

This folder replaces the **look** of the app (sidebar + flat grey cards) with frosted‑glass cards on a gradient or photo background. It does **not** change data, routes, stores or Vietnamese copy. Where this file and an older design doc disagree about looks, this file wins.

## What's in here

| Path | What it is |
|---|---|
| `TOKENS.md` | Readable token tables + computed contrast ratios |
| `tokens.css` | All tokens as CSS variables, themes via `data-theme` / `data-bg` / `data-accent`, glass recipe, fallbacks |
| `tokens.ts` | Same values for TS (charts, theme picker) — passes `tsc --strict` |
| `tokens.dtcg.json` | W3C Design Tokens format (Figma Tokens Studio, Style Dictionary) |
| `screens/*.png` | Target screenshots, 1×. **The source of truth for how things look** |
| `mockups/*.dc.html` | The mockup markup behind each screenshot — read it for exact px, gaps and structure. Reference only: don't copy the `<x-dc>` / `{{ }}` template syntax into the app. In mockups `--dark`/`--on-dark` = `--inverse`/`--on-inverse` in tokens. |
| `assets/backgrounds/` | `dawn-hills-tall.jpg` = default photo background, `dawn-hills.jpg` = vision tile sample |

## Screens

| Screenshot | Mockup | Width | Shows |
|---|---|---|---|
| `today-desktop-dawn.png` | `Main.dc.html` | 1440 | Today, light, Bình minh background, tangerine accent |
| `today-laptop-1280-dawn.png` | `Main.dc.html` | 1280 | Same page at laptop width |
| `today-desktop-night.png` | `DesktopNight` → `Main` | 1440 | Dark theme (Đêm) |
| `today-desktop-photo.png` | `DesktopPhoto` → `Main` | 1440 | Photo background, butter accent |
| `today-ipad-834-mist.png` | `Tablet` → `Main` | 834 | Same page reflowed for iPad portrait, Sương mai background, lime accent |
| `today-phone-dawn.png` | `Phone.dc.html` | 390 | Phone layout (full scroll height) |
| `today-phone-night.png` | `PhoneNight` → `Phone` | 390 | Phone, dark, lavender accent |
| `glass-kit.png` | `Kit.dc.html` | 1280 | Backgrounds, accents, type, radii, components |

## Visual rules

1. **Background**: one fixed layer behind everything (`.app-bg` in tokens.css). Never put gradients on cards.
2. **Glass card**: `--glass` + `backdrop-filter: blur(var(--blur)) saturate(150%)` + 1px `--line` border + `--radius-card` (32) + `--shadow-card`, padding `--card-pad`. Inside a card use `--glass-2` (raised) or `--well` (recessed) — never blur twice.
3. **One dark panel per screen** (`--panel`): on Today it is the Daily check‑in. Its form controls need `color-scheme: dark`.
4. **One accent** (user picks; default tangerine). Use only for: today/now, the selected choice, badges, the + button, ⌘N key. Text on accent is always `--on-accent`.
5. **Strong fill = `--inverse`** (near‑black in light, near‑white in dark): active nav item, primary button, done checks, the current event, chart bars.
6. **Big numbers are light (300)**, labels are 500, titles 600. Font: Be Vietnam Pro, bundled locally.
7. **Progress** = pill track with diagonal `.hatch` stripes for the remaining part; fill is accent (today), inverse (week), glass‑2 (month) or outline (year).
8. **Everything rounded**: pills for controls, 22–32px for surfaces. Tap targets ≥ 44px. Icons: 1.8px stroke, round caps, 18–22px.
9. **No sidebar.** Navigation is a floating pill (≥768px) or a floating tab bar (<768px).

## Responsive layout

| Width | Layout |
|---|---|
| ≥ 1200 | Top bar: logo pill · nav pill (centered) · actions. Today = rows of flex‑wrap cards (below). |
| 768–1199 | Same top bar; nav pill scrolls horizontally inside itself; logo shrinks to the mark. Cards wrap to 2 columns, then full width. |
| < 768 | **Phone layout**, not the shrunk page: header (avatar → Profile, date, search, bell), greeting, accent year card, 3 stat tiles, now/next, check‑in, plan, habits carousel, weekly focus, floating tab bar. Bottom padding 132px + safe area. |

Today page structure (desktop/tablet) — flex‑wrap rows, `gap: var(--card-gap)`, items `min-width: 0`:

```
Header:  [logo pill flex:0 1 auto] [nav pill flex:1 1 0] [actions flex:none]
Bar:     one glass pill, 56px: [date + greeting] [4 rings: today, week, month, year; words on hover or focus] [plan icon] [Ghi nhanh ⌘N]
Row 1:   [Kế hoạch hôm nay 4fr] [Thói quen 4fr, one line per habit] [column: Lịch trình + Trọng tâm tuần 3fr] [Ghi nhận hằng ngày 3fr, panel]
Row 2:   [Tiến độ tuần] [Bảng tầm nhìn] [Ngày này năm xưa, when there is one]
```

Cards are as tall as their content, and only the page scrolls: a long list never scrolls inside its card. This replaces the hero and capsule rows in the older Today screenshots and mockups.

Navigation items (labels unchanged): Hôm nay · Hộp thư (badge) · Công việc · Lịch · Mục tiêu · Tiến độ · Thư viện · **≡** (Nhìn lại, Bảng tầm nhìn, Tài chính, Sức khỏe, Trợ lý; pinned outside the scrolling row, and on one of those screens it shows that screen's name with ▾ and the strong fill). Actions: search (⌘K), sun/moon toggle, notifications, avatar → Profile (Settings lives there). Phone tab bar: Trang chủ · **Hôm nay** · + (Ghi nhanh) · Việc · **Menu** (`/menu`: a grid of links to every screen without a tab, Thư viện included).

## Components to build (shared primitives)

| Component | Spec |
|---|---|
| `AppBackground` | Fixed layer; reads `data-bg`; photo from user's blob or default asset |
| `GlassCard` / `PanelCard` | Rule 2 / rule 3; `as="section"` with `aria-labelledby` |
| `TopNav`, `TabBar` | See navigation. Active = inverse pill. Tab bar: glass‑2, blur 26px, radius pill, height 76, center + 60px accent |
| `Button` | `primary` (inverse, 56), `secondary` (glass, 56), `accent` (56), `chip` (glass‑2, 40), `icon` (round 48/44), `arrow` (round 40, ↗) |
| `PillInput`, `NoteArea` | 56 / 52 tall pill with leading +, trailing `Enter` key cap; note area inside panel with camera button |
| `CheckCircle` | 40 (phone 44): empty = 2px `--ink-3` ring; done = inverse fill + check; task text goes ink‑3 + line‑through |
| `ProgressCapsule`, `HatchBar` | Rule 7. HatchBar 14–16px with a 3px accent tick for "planned" |
| `Ring` | 64 / 44px, stroke 8–9, track `--well-line`, value accent |
| `WeekDots` | done = inverse · missed = dashed `--warn-ink` · today = accent + 2px ink ring · future = `--well` |
| `MoodPicker`, `EnergyMeter` | 5 × 48px faces, selected accent; 5 rising bars (20→60px), filled up to choice with `--on-panel` |
| `EventBlock` | past = well + line‑through · now = inverse + "Đang diễn ra · còn N phút" + accent progress · next = glass‑2 + accent dot |
| `WeekBars` | 10px rounded bars, inverse; today accent with a value pill above; future = 10px dots |
| `VisionTile` | Image cover, glass chip top‑left, round arrow top‑right, glass caption bottom |
| `WarnNote` | `--warn-bg` / `--warn-ink`, radius 18, clock icon |

## Theme setting

Settings › **Giao diện**: Nền (Bình minh · Sương mai · Ảnh của bạn · Đêm), Màu nhấn (4 swatches), Chế độ (Tự động · Sáng · Tối). Persist in the settings table; apply as `data-theme`, `data-bg`, `data-accent` on `<html>` before first paint (no flash). Đêm ⇒ `data-theme="dark"`. "Ảnh của bạn" lets the user pick a Vision board image or upload one (stored locally as a Blob).
