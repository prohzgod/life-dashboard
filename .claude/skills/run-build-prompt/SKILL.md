---
name: run-build-prompt
description: Use when the user asks to run, do or continue a numbered prompt or a "Later" item from docs/PROMPTS.md in the Life Dashboard repo (e.g. "run prompt 3", "next prompt", "doing Calendar"), or to commit the result of one.
---

# Running a build prompt

## Overview

Each prompt in `docs/PROMPTS.md` is one feature built end to end, checked against the approved designs, then committed straight to `main` when the user says so. CLAUDE.md has the coding rules. This skill holds the workflow and the traps that CLAUDE.md doesn't cover.

## Git workflow (overrides PROMPTS.md)

PROMPTS.md describes a cloud branch-and-PR flow. **This repo doesn't use it.**

| Step | What happens here |
|---|---|
| Branch | Stay on `main`. Make no feature branch. |
| When to commit | Only after you report and the user says "commit it". Never commit on your own. |
| How many commits | One commit per prompt, unless the user asks for a split. |
| Push / PR | Never push and never open a PR, unless the user asks in that message. |
| Author | Use the repo-local `git config user.name`, which is already set. Leave it unchanged. |
| Message | An imperative title (`Build the X: a, b, c`), then a short paragraph, then `-` bullets grouped as Domain / Data / UI / Tests, then the Co-Authored-By line. |

## Steps

1. **Read.** Read the PRODUCT.md sections for the feature. Look at every matching `design/screens/*-{light,dark}.png`, desktop and `Mobile*`, and read its `design/mockups/*.dc.html` for sizes, copy and tokens.
2. **Domain.** Put pure logic in `src/domain/*.ts` with `*.test.ts` next to it, written test-first.
3. **Data.** For any schema change:
   - Add `version(n+1)` in `src/data/db.ts` with an `.upgrade()` that calls a `normalizeX()`. Also apply that normalizer in `backup.ts` `importReplacingAll`, so older exports still import.
   - Add a new table to `dataTableNames`.
   - Never write inside a `useLiveQuery` reader. Startup rows go in an `ensureX()` that `initData()` calls.
   - Make Dexie transaction callbacks `async`.
   - Export new modules from `src/data/index.ts`. Lint forbids importing `dexie` outside `src/data/`.
4. **UI.** Use CSS Modules and tokens only; add missing tokens to `tokens.json` and `tokens.css`. Load chart routes lazily via `LazyScreens.tsx`. Give the route's phone chrome an entry in `src/app/mobileChrome.ts`. Back links read "Back to X".
5. **Tests.** Desktop e2e goes in `e2e/<feature>.spec.ts`. Phone e2e goes **only** in `e2e/mobile.spec.ts`, because the `phone` project matches only that file.
6. **Visual check.** Use `.scratch/` (git-ignored) and reuse `.scratch/seed.mjs` and `pairs.mjs`:
   - Seed realistic data first, because empty screens hide layout bugs.
   - Take screenshots at the design size: desktop 1440×960, phone 390×844 (profile 390×1290), light and dark.
   - Lay each one beside its design PNG and fix the differences.
7. **Verify.** Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run test:e2e`. Run e2e more than once when a test drags or depends on timing.
8. **Report and stop.** Tell the user:
   - what was built;
   - what differs from the design, and why;
   - what is not built yet;
   - the check results.

   Then ask whether to commit.

## Common mistakes

| Mistake | Fix |
|---|---|
| Following PROMPTS.md: branch, push, open a PR | Commit on `main` after approval. No push. |
| New field shows as `undefined` on old rows or imports | Fix it with a normalizer in both the upgrade and `backup.ts`. |
| A screen crashes because a reader called from `useLiveQuery` writes (live queries are read-only) | Move the write into an `ensureX()` that runs from `initData`. |
| A phone test silently never runs | It's outside `mobile.spec.ts`; move it there. |
| Two links share the same accessible name ("Home") | Name back links "Back to …". |
