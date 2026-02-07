<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AI Mastering Agent for Beatport & Spotify

Repository: **https://github.com/bp848/ai-mastering-agent-for-beatport---spotify**

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set in [.env](.env) or [.env.local](.env.local):
   - `GEMINI_API_KEY` — your Gemini API key
   - `VITE_SUPABASE_URL` — your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — your Supabase anon/public key
3. Run the app:
   `npm run dev`

## Deploy to production (e.g. mastering.plu.plus)

1. Set **VITE_SUPABASE_URL** and **VITE_SUPABASE_ANON_KEY** in your host’s environment (e.g. Vercel → Project → Settings → Environment Variables). Without these, the app will show “Supabase is not configured”.
2. Build: `npm run build`
3. Deploy the **contents of the `dist/` folder** (do not deploy the repo root).
4. **Do not** add `cdn.tailwindcss.com` or `<link href="/index.css">`. This app uses Tailwind via PostCSS; CSS is bundled into the build. Using the CDN or a direct `/index.css` link causes console warnings and 404s.

## Console warnings / errors (reference)

| Message | Cause | Fix |
|--------|--------|-----|
| `cdn.tailwindcss.com should not be used in production` | HTML or host injects Tailwind CDN | Deploy only `dist/`; do not add Tailwind script to the page. |
| `GET …/index.css 404` | Something requests `/index.css` | CSS is bundled (e.g. `assets/index-*.css`); remove any `<link href="/index.css">`. |
| `GET …/vite.svg 404` | Request for default Vite asset | `public/vite.svg` is included; redeploy so it is served. |
| Recharts `width(-1) and height(-1)` | Chart container has no size on first paint | Chart wrapper uses `minHeight`; ensure parent has size (e.g. not `display:none`). |
| `Cannot find module '@tailwindcss/postcss'` | PostCSS config not resolving the plugin | Use `postcss.config.cjs` (this repo) and run `npm install`. |
| `supabaseUrl is required` / `Supabase is not configured` | Supabase env vars not set | Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in .env (local) or in the host’s env (production). |
