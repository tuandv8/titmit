# Learning Hub — Fix V3

## Fixes

1. **Menu navigation bug**: fixed `save()` calling a missing `updatePill()` function. Menu items now navigate immediately without requiring a manual refresh.
2. **English audio**: primary audio source is now `Dictionary API` US pronunciation audio (`-us.mp3`). The API's pronunciation records identify Wikimedia Commons sources/licenses. If the US recording is unavailable, the app resolves another available pronunciation from the API, then falls back to the device's `en-US` speech voice.
3. **Cache busting**: `index.html` loads `app.js?v=3` so GitHub Pages/browser caches are less likely to keep the old JavaScript.

## Files to replace

- `app.js`
- `index.html`

Keep `content.js`, `math-data.js`, `styles.css`, `.nojekyll`, and `assets/` unchanged.

## Deploy

Copy these two files to the repository root and commit/push:

```bash
git add app.js index.html
git commit -m "Fix menu navigation and English audio"
git push
```

The English audio implementation uses a direct US MP3 URL first so playback is initiated inside the user's click/tap gesture. If that URL is unavailable, it queries the Dictionary API and then falls back to browser `en-US` speech synthesis.
