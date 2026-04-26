# कथा एकादेशको (Katha Ekadeshko)

AI story studio: **Vite + React** front end, **Vercel** serverless APIs, optional **Supabase** (auth + projects + storage), and a **local Node worker** for FFmpeg 4K renders.

## Scripts

| Command | Purpose |
|--------|---------|
| `npm run web:dev` | Vite dev server (default port `4173`) |
| `npm run dev` | `vercel dev` (APIs + app; needs Vercel CLI) |
| `npm run build` | Production build → `web-dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint on `src/` |

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

## Troubleshooting: `render_jobs` / `progress` / schema cache

If **Generate Video (4K)** returns an error like **Could not find the 'progress' column of 'render_jobs' in the schema cache**:

1. In **Supabase** → **SQL Editor**, run the full script: **`supabase/render_jobs_add_missing_columns.sql`** (from this repo).
2. Wait **about one minute** so PostgREST reloads the schema, then try again.
3. If it still fails: **Project Settings →** pause/restart isn’t always available; creating a trivial migration in **Database → Migrations** or opening a ticket can force a cache refresh. The one-line fix is often enough:  
   `alter table public.render_jobs add column if not exists progress int not null default 0;`

## Troubleshooting: worker **claim** returns **500** / “String must contain at least 8 character(s)” on **`id`**

That response comes from an **older** deploy of `/api/worker-claim` that required UUID-length ids. Your `render_jobs.id` may be a **short numeric** primary key; the worker sends it as a string (e.g. `"5"`). **Redeploy the latest `api/` code to Vercel** (the version that uses `renderJobIdSchema` in `api/_renderSupabase.js` — `min(1)`, not `min(8)`). The local worker alone cannot fix server-side validation.

## Layout

- `src/web/` — app entry, `window.katha` bridge, Supabase wiring.
- `src/renderer/` — UI, hooks, i18n.
- `api/` — Vercel functions (story stream, projects, Leonardo, render + worker protocol).
- `backend/` — shared pipeline (models, Leonardo, TTS, prompts).
- `worker/` — FFmpeg slideshow + 4K upscale + Supabase upload.
