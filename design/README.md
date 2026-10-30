# Design

Life Dashboard uses **Glass v2**: frosted-glass cards on a gradient or photo background, a floating pill navigation and phone tab bar, one accent colour and Be Vietnam Pro. It replaced Grid on 30 October 2026.

- `v2/`: the Glass v2 pack, the visual source of truth. `v2/README.md` is the spec, `v2/screens/*.png` show how things look, `v2/mockups/*.dc.html` give exact sizes (reference only), `v2/assets/backgrounds/` the photos.
- `tokens.css`: the tokens the app imports, light and dark, per background (`data-bg`) and accent (`data-accent`), plus the older token names mapped onto them. `tokens.ts` has the same values for code; `tokens.dtcg.json` for design tools; `TOKENS.md` describes them.

Check a screen at 390, 834, 1280 and 1440 wide, on Dawn, your photo and Night.
