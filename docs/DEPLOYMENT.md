# Deployment Guide

## Web (Vercel) — recommended production channel

1. Connect the Git repository to [Vercel](https://vercel.com).
2. **Root directory:** repository root (folder containing `vercel.json`).
3. **Build command:** `npm run build` (or leave empty to use `vercel.json`).
4. **Output directory:** `dist` (from `vercel.json`; built via `web-dist` → `dist` sync). Disable dashboard overrides or set Output to `dist`.
5. Set environment variables from `.env.example` in the Vercel dashboard.
6. Deploy. Confirm the header build badge shows the current stamp (`src/renderer/src/config/uiBuild.ts`).

### Local parity

```bash
npm install
cp .env.example .env.local   # fill keys
npm run dev:vercel             # APIs + UI on one origin
```

### Cache busting

`vercel.json` sets `no-cache` on `/` and `/index.html`. Hard-refresh if an old shell appears.

## Desktop (Tauri)

Desktop builds are **not** deployed to Vercel. Build locally or in CI:

```bash
npm run verify          # typecheck + lint + web build
npm run desktop:build   # native installers
```

See [`TAURI_DESKTOP.md`](TAURI_DESKTOP.md).

## Render worker (optional, recommended)

Host the worker on a PC or VM with FFmpeg:

```bash
cd worker && npm install
cp .env.example .env
node worker.js
```

`APP_BASE_URL` must match your deployed Vercel URL. `WORKER_TOKEN` must match Vercel.

## Full studio vs stub build

If Vercel logs show **~106 modules** and **one** `index-*.js` (~257 KB), you deployed **old GitHub `main`** (`root: src/web` stub). A correct build shows **~660 modules**, multiple chunks, and **~800+ KiB** total JS.

`npm run verify` runs `scripts/assert-production-bundle.mjs` to block stub deploys locally.

**Fix:** commit and push your branch (including `web/`, `vite.web.config.ts`, and untracked `src/renderer` work), then redeploy. Vercel **Root Directory** must be the repo root (folder with `vercel.json`).

### Deploy failed after a good Vite log

If the log shows **660 modules** / `kathaWebBridge-*.css` but the deployment still fails, the Vite step succeeded. On **Vercel Hobby**, non-Next.js projects are limited to **12 serverless functions** (one file per `api/*.js`). This repo uses a **single** `api/gateway.js` plus `vercel.json` rewrites so all `/api/*` URLs still work.

If Build fails with only **106 modules**, you are still on old `main` — pull latest and redeploy.

**Output directory:** `web-dist` (set in `vercel.json`). No dashboard changes required.

## Production architecture

See [`PRODUCTION_ARCHITECTURE.md`](PRODUCTION_ARCHITECTURE.md) for API hardening, rate limits, security headers, and provider registry.

## Release verification

```bash
npm run verify
```

Checks TypeScript, ESLint, i18n audit, and production Vite build.
