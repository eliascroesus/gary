# Brand kit

80 images (30 promo posts, 10 in every other set), built from the site's own art (`/assets`) and fonts (`brand/fonts`).
Every PNG is rendered at 2× its upload size (the file name says the size it's made for).

| Folder | Size | Use |
| --- | --- | --- |
| `out/x-header` | 1500×500 | X profile banner (words kept clear of the profile photo, bottom-left) |
| `out/dexscreener` | 1500×500 (3:1) | DexScreener token header; pair with a logo as the 1:1 icon |
| `out/fomo` | 1500×500 (3:1) | Fomo coin banner (Fomo publishes no size; 3:1 is the common shape) |
| `out/promo` | 1200×675 | Posts on X and Telegram: 1–10 tell the story, 11–30 are the eagles at work and play |
| `out/telegram` | 1080×1080 | Telegram squares: welcome, GM, GN, reactions |
| `out/logo` | 1000×1000 | Transparent logos, badges and lockups |

Re-render (needs Playwright):

```sh
npm i -D playwright && npx playwright install chromium
node brand/kit.js                  # everything
node brand/kit.js --ticker EAGLE   # adds a $EAGLE badge where a design has a slot
node brand/kit.js --only logo      # one set
```

Same rules as the site: the eagles eat, nobody is promised anything — no prices, targets or returns.
