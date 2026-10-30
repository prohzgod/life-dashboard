# Restyle prompts — Glass v2

Paste these into a Claude Code session one at a time, in order. Start each in **Plan mode**, read the plan, then let it build. Open a PR (or commit) after each step so you can roll back.

Each prompt assumes `design/v2/` from this pack is in the repo root.

---

## 1 · Plan the restyle (no code yet)

```
We are restyling the app to the "Glass v2" design. Read, in this order:
design/v2/README.md, design/v2/TOKENS.md, every image in design/v2/screens/,
and design/v2/mockups/Main.dc.html + Phone.dc.html for exact sizes.

Rules: change the look only. Do not change data models, stores, routes, business
logic or Vietnamese copy. Fonts must be bundled locally (offline-first).

Then look at our current code (layout shell, sidebar, Today page, shared UI
components, current tokens/CSS) and write a plan:
1. which files/components change, which are new primitives,
2. how old tokens map to the new ones (and what gets deleted),
3. the order of work in small, reviewable steps.
Also add a short "Design v2" section to CLAUDE.md pointing to design/v2/README.md
as the visual source of truth. Wait for my OK before coding.
```

## 2 · Foundation: tokens, font, background, theme

```
Implement the foundation from design/v2:
- Add design/v2/tokens.css as the app's token sheet (import once at the root,
  replacing the old color/typography tokens; keep any non-visual tokens).
- npm i @fontsource/be-vietnam-pro and import weights 300–700. No Google Fonts.
- AppBackground component per README (fixed layer, data-bg, photo from a stored
  Blob or design/v2/assets/backgrounds/dawn-hills-tall.jpg copied to public/backgrounds/).
- Theme state: data-theme / data-bg / data-accent on <html>, persisted in the
  settings table, applied before first paint (inline script reading a tiny
  cached copy so there is no flash). "Tự động" follows prefers-color-scheme
  (light → dawn, dark → night).
- Keep the reduced-transparency / no-backdrop-filter fallbacks from tokens.css.
Show me the app with each background before moving on.
```

## 3 · Primitives

```
Build the shared primitives listed under "Components to build" in
design/v2/README.md (GlassCard, PanelCard, Button variants, PillInput, NoteArea,
CheckCircle, ProgressCapsule, HatchBar, Ring, WeekDots, MoodPicker, EnergyMeter,
EventBlock, WeekBars, VisionTile, WarnNote). Use only CSS variables from
tokens.css — no hard-coded colors or radii. Real <button>/<a>/<input> elements,
aria-pressed for toggles, aria-label on icon-only buttons, visible focus ring.
Add a dev-only /kit route that renders all of them like design/v2/screens/glass-kit.png
in light and dark, and compare it to that screenshot.
```

## 4 · App shell: top nav + phone tab bar

```
Replace the sidebar shell with the Glass v2 navigation (design/v2/README.md,
"Responsive layout" + "Navigation items"):
- ≥768px: floating header — logo pill, centered nav pill (scrolls horizontally
  when narrow, logo shrinks to its mark), actions (search ⌘K, sun/moon, bell,
  avatar → Profile). "Thêm ▾" menu holds the remaining routes.
- <768px: floating glass tab bar (Trang chủ · Hôm nay · + · Công việc · Thư viện),
  respecting safe-area-inset-bottom; content gets bottom padding.
Every existing route must stay reachable. Keyboard: the menu works with
arrow keys + Esc.
```

## 5 · Today screen

```
Rebuild the Today page layout to match design/v2/screens/today-desktop-dawn.png
(≥768) and today-phone-dawn.png (<768), using the structure in
design/v2/README.md ("Today page structure") and the primitives. Wire every
card to our existing data/hooks — sample text in the mockups is not real data.
Design the empty states in the same style (e.g. no events → a glass-2 row
"Hôm nay lịch của bạn trống…"). Check it at 390, 834, 1280 and 1440 wide in
dawn and night: no horizontal scroll, nothing clipped.
```

## 6 · Restyle the other screens

```
Apply Glass v2 to every other screen (Hộp thư, Công việc, Lịch, Mục tiêu,
Tiến độ, Nhìn lại, Thư viện & nhật ký, Bảng tầm nhìn, Tài chính, Sức khỏe,
Trợ lý, Hồ sơ/Cài đặt). Keep each screen's structure and behaviour; swap
surfaces, controls, type and spacing to the primitives and rules in
design/v2/README.md. Max one PanelCard per screen. Add Settings › Giao diện
(background, accent, mode) as described in the README. Do one screen per
commit.
```

## 7 · Check the work

```
Write Playwright visual checks: screenshot Today at 390/834/1280/1440 in
dawn, photo and night, and the /kit page. Compare with design/v2/screens and
list any differences bigger than spacing nits. Run axe on each screen and fix
contrast, labels and focus issues. Confirm the app still works fully offline
(fonts and background load with the network off).
```
