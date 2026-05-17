# Production architecture — Katha Ekadeshko

This document describes production hardening added for Vercel deployment. **No public API URLs were renamed** — see `docs/API_DOMAIN_MAP.md` for logical domains.

## API layer (`api/_lib/`)

| Module | Role |
|--------|------|
| `http.js` | `createJsonHandler` — methods, Zod validation, security headers, rate limits, safe errors |
| `parseBody.js` | Consistent JSON body parsing (string or object) |
| `rateLimit.js` | Per-instance in-memory limits (prepare for Redis/KV later) |
| `log.js` | `safeLog`, `publicErrorMessage` — no stack traces to clients in production |
| `projectsSupabase.js` | Shared Supabase client for authenticated project CRUD |

All JSON routes should migrate to `createJsonHandler`. Exceptions:

- `jobs-stream-generate` — SSE stream + stricter rate limit
- `narrator-preview` — binary MP3 response

## AI providers (`core/providers/aiProviderRegistry.js`)

Server-only registry for OpenAI, Gemini, DeepSeek, Leonardo, TTS. `resolveTextProvider()` picks the first configured provider. Pipeline code can call this without hard-coding a vendor.

## Render engine (`core/render-engine/`)

Facade for timeline + future FFmpeg/GPU paths. Browser export today; `render_jobs` + local `worker/` for MP4.

## Vercel (`vercel.json`)

- Security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
- Long cache for hashed `/assets/*`
- `maxDuration` 60s on API routes (Hobby-safe; raise on Pro for long SSE)
- SPA rewrite to `/` (API routes unchanged)

## Frontend performance

- Lazy-loaded: `PostExportVideoWorkspace`, `SavedProjectsWindow`, `MonitorUserGuide` (`App.tsx` + `Suspense`)
- Existing pipeline, player, and styles unchanged

## Health check

`GET /api/health` — used by Settings → Online mode (`kathaWebBridge.fetchHealth`).

## Deploy checklist

1. `npm run verify`
2. Set Vercel env vars from `.env.example` (production + preview)
3. `WORKER_TOKEN` must match local worker `.env`
4. Confirm `SUPABASE_SERVICE_ROLE_KEY` only on server
5. Redeploy; hit `/api/health` and run one short generation smoke test

## Future work (non-breaking)

- Edge rate limiting (Vercel KV / Upstash)
- Physical `api/story/` folders with rewrites (optional)
- Virtualized timeline for 50+ scenes
- OAuth for social publish
