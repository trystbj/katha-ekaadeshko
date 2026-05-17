# कथा एकादेशको (Katha Ekadeshko)

AI **cinematic storytelling studio**: **Vite + React** front end, **Vercel** serverless APIs, optional **Supabase** (auth + projects + storage), and a **local Node worker** for FFmpeg renders.

The app automatically directs narration, camera motion, subtitles, soundtrack, atmosphere, and episodic continuity — you provide the story seed, style, and language.

**Release:** v1.0 hybrid **web + desktop** (Tauri). Build badge **3.0** in the studio header confirms the loaded UI.

**User guide:** Story Monitor → **Settings** → **Open guide** (searchable Help Center).

**Docs:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) · [`docs/TAURI_DESKTOP.md`](docs/TAURI_DESKTOP.md) · [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) · [`docs/RELEASE_PREPARATION.md`](docs/RELEASE_PREPARATION.md)

## Open the app

- **Local (UI only):** after `npm install`, run **`npm run dev`** or **`npm run web:dev`** (same thing). The terminal prints the URL — usually **[http://localhost:4173](http://localhost:4173)** (Vite may pick another port if `4173` is busy).

### Vercel: UI looks unchanged after deploy

1. **Dashboard overrides:** In Vercel → Project → **Settings** → **General**, set **Root Directory** to this app folder (if the Git repo root is higher). Under **Build & Development**, ensure **Build Command** is `npm run build` (or empty to use `vercel.json`) and **Output Directory** is **`web-dist`** — not `dist`. Wrong output = old or blank UI.
2. **Confirm the new build:** After deploy, the header badge should show **`build 2.5`** (see `src/renderer/src/config/uiBuild.ts`). If it shows an older number, the browser or CDN is serving a cached shell — hard-refresh (**Ctrl+Shift+R**) or open the unique deployment URL from the **Deployments** tab.
3. **Repo must include `vite.config.ts`:** The default Vite preset runs `vite build` without `--config`; this repo’s real config lives in `vite.web.config.ts` and is re-exported from root **`vite.config.ts`** so output always goes to **`web-dist/`**.
4. **Build must succeed:** Run `npm run build` locally before pushing. If Vercel builds fail, Production keeps showing the **previous** successful deployment (old UI). This project uses **Tailwind CSS v3** with PostCSS (`tailwindcss` v4 requires a different PostCSS setup).

- **Local with APIs:** run **`npm run dev:vercel`** (Vercel CLI — requires `vercel login`) so `/api/*` is available on the same origin.
- **Production:** deploy this repo to Vercel; your live URL will be `https://<your-project>.vercel.app` (or your custom domain). This repository does not embed a fixed production URL — use the link shown in your Vercel dashboard.

## Scripts

| Command | Purpose |
|--------|---------|
| `npm run dev` / `npm run web:dev` | Vite dev server (default port `4173`; opens browser) |
| `npm run dev:vercel` | `vercel dev` (APIs + app; needs `vercel login`) |
| `npm run build` | Production build → `web-dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint on `src/` |
| `npm run verify` | typecheck + lint + production build (pre-release) |
| `npm run desktop:dev` | Tauri dev window + Vite (requires [Rust + Tauri CLI](docs/TAURI_DESKTOP.md)) |
| `npm run desktop:build` | Native desktop installers after `npm run build` |

## Hybrid web + desktop

- **Web** — deploy `web-dist/` to Vercel (see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)).
- **Desktop** — same UI in a Tauri shell (`desktop/src-tauri/`). Local worker + filesystem hooks are recommended for best export performance.
- **Shared core** — one React renderer, one cinematic pipeline; no forked app logic.

## Environment

Copy `.env.example` to `.env.local` for Vercel CLI, or set variables in the Vercel dashboard. Browser-visible keys use the `VITE_` prefix.

- **AI**: at least one of `OPENAI_API_KEY`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`; **Leonardo** optional for scene stills (`LEONARDO_API_KEY`).
- **Supabase (web)**: `SUPABASE_*` for server routes; `VITE_SUPABASE_*` for the browser client.
- **Render queue**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WORKER_TOKEN` on Vercel; same Supabase + `WORKER_TOKEN` on the PC worker (`worker/worker.js`).

## Local render worker

1. Copy **`worker/.env.example`** to **`worker/.env`** and fill in values (same `WORKER_TOKEN` as on Vercel; `APP_BASE_URL` = your deployed site, e.g. `https://….vercel.app`; Supabase URL + **service_role** key for uploads).
2. Install and run:

```bash
cd worker && npm install && node worker.js
```

Alternatively, set the same variables in your shell (PowerShell: `$env:APP_BASE_URL="https://…"; $env:WORKER_TOKEN="…";` then `node worker.js`).

Set `WORKER_VERBOSE=1` for idle polling logs. By default you only see startup, **job claimed**, errors, and completion paths.

## Security / `npm audit`

Most reported issues come from the **`vercel` dev CLI** (transitive deps). Production traffic serves the **static Vite build** plus serverless handlers, not the full Vercel builder graph. Run `npm audit` periodically; use `npm audit fix` without `--force` first. Upgrading `vercel` major versions may require adjusting the `dev` script.

## Troubleshooting: `render_jobs` (missing **`progress`**, **`video_url`**, etc.)

If the app or worker errors on **`render_jobs`** (e.g. **Could not find the 'progress' column** in the schema cache, or **`column render_jobs.video_url does not exist`**):

1. In **Supabase** → **SQL Editor**, run the full script: **`supabase/render_jobs_add_missing_columns.sql`** (from this repo). It adds **`video_url`**, **`progress`**, **`stage`**, **`payload`**, **`worker_id`**, **`error`**, timestamps, and the status index—safe to run more than once.
2. Wait **about one minute** so PostgREST reloads the schema, then try again.
3. One-line fixes if you only need one column:  
   `alter table public.render_jobs add column if not exists progress int not null default 0;`  
   `alter table public.render_jobs add column if not exists video_url text;`

## Troubleshooting: worker **claim** returns **500** / “String must contain at least 8 character(s)” on **`id`**

That response comes from an **older** deploy of `/api/worker-claim` that required UUID-length ids. Your `render_jobs.id` may be a **short numeric** primary key; the worker sends it as a string (e.g. `"5"`). **Redeploy the latest `api/` code to Vercel** (the version that uses `renderJobIdSchema` in `api/_renderSupabase.js` — `min(1)`, not `min(8)`). The local worker alone cannot fix server-side validation.

## Layout

- `web/` — Vite app entry (`index.html`, `main.tsx`).
- `src/web/kathaWebBridge.ts` — `window.katha` bridge, Supabase wiring (imported by `web/`).
- `src/renderer/` — UI, hooks, store, i18n, Help Center content.
- `core/` — shared cinematic & voice types.
- `api/` — Vercel functions (story stream, projects, Leonardo, render + worker protocol).
- `backend/` — pipeline, cinematic orchestrators (v2–v4), TTS, prompts.
- `worker/` — FFmpeg slideshow + upscale + Supabase upload.
- `docs/` — architecture, deployment, desktop, troubleshooting, release audit.
- `desktop/src-tauri/` — Tauri 2 hybrid desktop shell.

## Architecture (short)

1. **Generate** — `/api/jobs-stream-generate` runs `kathaPipeline` (story → script → assets → `buildEvolutionCinematicPlan`).
2. **Persist** — project memory, world state, relationships saved on the project for next episode.
3. **Render** — queue job → local `worker/worker.js` consumes `storyAudioPlan` + stills.
4. **Playback** — cinematic player applies director plan overlays (motion, atmos, VFX, evolution).

Details: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Cinematic modules: [`core/cinematic/README.md`](core/cinematic/README.md).

## Troubleshooting (app)

| Issue | Try |
|-------|-----|
| Settings shows **Offline** | Use `npm run dev:vercel`, or set `KATHA_DEV_API_PROXY` in `.env.local` to your deployed URL |
| Generate fails | Ensure at least one of `OPENAI_API_KEY`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY` on Vercel |
| No narration audio | TTS requires online API; serverless mode may skip file generation |
| Render stuck | Run worker with matching `WORKER_TOKEN`; apply `supabase/render_jobs_add_missing_columns.sql` |
| Subtitle drift | Regenerate narration or adjust subtitle studio timing |
| UI cached after deploy | Hard refresh; check header build badge (`uiBuild.ts`) |

Full playbooks: [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) and in-app **Help Center → Troubleshooting**.
