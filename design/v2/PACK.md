# Life Dashboard · Glass v2 restyle pack

A new look for the app: frosted‑glass cards with big rounded corners on a gradient or photo background, a floating pill navigation instead of the sidebar, and a phone layout with a floating tab bar. Light, dark and photo backgrounds; four accent colours. Font: Be Vietnam Pro.

## How to use

1. Unzip this into the **root of your repo**. It only adds files:
   - `design/v2/` — screenshots, mockup markup, tokens, background images, the spec (`design/v2/README.md`)
   - `docs/RESTYLE_PROMPTS.md` — the prompts for Claude Code
   - this file
2. Commit and push.
3. In a Claude Code session on the repo, paste the prompts from `docs/RESTYLE_PROMPTS.md` one at a time (Plan mode first). Step 1 only plans; nothing changes until you approve.

## Tokens

| File | Use |
|---|---|
| `design/v2/TOKENS.md` | Human‑readable tables: colours (light/dark), accents, backgrounds, type scale, spacing, radius, glass, shadows, layout, motion, contrast results |
| `design/v2/tokens.css` | Drop‑in CSS variables + theme switching + glass recipe + accessibility fallbacks |
| `design/v2/tokens.ts` | Same values for TypeScript |
| `design/v2/tokens.dtcg.json` | Standard W3C token format for design tools |

Every text colour was checked against its real surface (including the photo background); all pass WCAG AA.
