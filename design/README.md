# Designs

The approved UI/UX for Life Dashboard (Midnight & Brass), exported from the design canvas.

- `screens/` — a PNG of every screen in the light and the dark theme. Desktop screens are 1440×960 (design system board 1440×1100), mobile screens 390×844. Profile screens are drawn at their full scroll height (390×1290). Below 768px wide the app uses the mobile layouts: a tab bar (Home · Today · + capture · Tasks · Library) instead of the sidebar, with every other screen reached from the bento Home, and Settings inside Profile (avatar, top-right). **This is what the built app should look like.**
- `mockups/` — the source markup of each screen. Use it to read exact spacing, sizes, copy and which token each element uses. It is reference only, not code to copy: translate it into React components and CSS Modules.
- `TOKENS.md`, `tokens.json`, `tokens.css`, `tokens.ts`, `tokens.dtcg.json` — the design tokens in every format (see TOKENS.md).

## Screen → route

| Screenshot | Mockup | Route |
| --- | --- | --- |
| `Today-*.png` | `Main.dc.html` | `/` |
| `Tasks-*.png` | `Tasks.dc.html` | `/inbox`, `/tasks` |
| `Calendar-*.png` | `Calendar.dc.html` | `/calendar` |
| `Goals-*.png` | `Goals.dc.html` | `/goals`, `/goals/:id` |
| `Progress-*.png` | `Progress.dc.html` | `/progress` |
| `Review-*.png` | `Review.dc.html` | `/review` |
| `Library-*.png` | `Library.dc.html` | `/library`, `/library/:nodeId` |
| `Vision-*.png` | `Vision.dc.html` | `/vision` |
| `Finance-*.png` | `Finance.dc.html` | `/finance` |
| `Health-*.png` | `Health.dc.html` | `/health` |
| `Assistant-*.png` | `Assistant.dc.html` | `/assistant` |
| `Settings-*.png` | `Settings.dc.html` | `/settings/privacy` |
| `Sidebar-*.png` | `Sidebar.dc.html` | app shell (every desktop route) |
| `MobileHome-*.png` | `MobileHome.dc.html` | `/` on phones: bento Home (app opens here) |
| `MobileHomeEdit-*.png` | `MobileHomeEdit.dc.html` | `/home/edit`: reorder, resize (S/M/L), hide, Add to Home sheet |
| `MobileToday-*.png` | `MobileToday.dc.html` | `/today` on phones (shows the offline state) |
| `MobileCapture-*.png` | `MobileCapture.dc.html` | capture bottom sheet (tab bar + button) |
| `MobileInbox-*.png`, `MobileTaskDetail-*.png` | `MobileInbox.dc.html`, `MobileTaskDetail.dc.html` | `/inbox`, `/tasks/:id` on phones |
| `MobileCalendar-*.png` | `MobileCalendar.dc.html` | `/calendar` on phones (day view) |
| `MobileGoals-*.png`, `MobileGoalDetail-*.png` | `MobileGoals.dc.html`, `MobileGoalDetail.dc.html` | `/goals`, `/goals/:id` on phones |
| `MobileProgress-*.png` | `MobileProgress.dc.html` | `/progress` on phones |
| `MobileReview-*.png` | `MobileReview.dc.html` | `/review` on phones (full-screen flow, no tab bar) |
| `MobileLibrary-*.png`, `MobilePage-*.png` | `MobileLibrary.dc.html`, `MobilePage.dc.html` | `/library`, `/library/:nodeId` on phones (editor toolbar replaces the tab bar) |
| `MobilePinSheet-*.png` | `MobilePinSheet.dc.html` | Library page "…" menu with the Pin to Home switch and toast |
| `MobileVision-*.png` | `MobileVision.dc.html` | `/vision` on phones |
| `MobileFinance-*.png`, `MobileHealth-*.png`, `MobileAssistant-*.png` | `Mobile*.dc.html` | module routes on phones (back to Home) |
| `MobileProfile-*.png` | `MobileProfile.dc.html` | `/profile`: avatar target; per-field blur + Settings list |
| `MobileProfileEdit-*.png` | `MobileProfileEdit.dc.html` | `/profile/edit`: fields with Shown / Blurred toggles |
| `MobileSettings-*.png` | `MobileSettings.dc.html` | `/settings/privacy` on phones (back to Profile) |
| `Map-*.png` | `Map.dc.html` | not a screen: navigation and data overview |
| `DesignSystem-*.png` | `DesignSystem.dc.html` | not a screen: token and component reference (build it as `/dev/components`) |

## Reading the mockup markup

Each `.dc.html` file is one screen in a small template format:

- Inline `style="…"` holds the real layout values; colors are `var(--token)` from `tokens.css`.
- `{{name}}` inserts a value computed in the `<script type="text/x-dc">` block at the bottom (`renderVals()`); that block also holds the sample data (tasks, habits, moods…), which doubles as seed/demo data.
- `<sc-for list="{{items}}" as="item">` repeats its children; `<sc-if value="{{flag}}">` shows them conditionally.
- `<dc-import name="Sidebar" active="goals">` mounts `Sidebar.dc.html` with that prop.
- `data-theme="dark"` on the root switches every token to its dark value.

The sample text and numbers in the mockups are examples, not product requirements.
