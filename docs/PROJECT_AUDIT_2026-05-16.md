# Project audit — 2026-05-16

Professional audit pass: documentation, safe cleanup, label alignment, verification. **No architecture redesign.**

## Verification results

| Check | Result |
|-------|--------|
| `npm run typecheck` | Pass |
| `npm run build` | Pass (`web-dist/`) |
| `npm run lint` | Pass (ESLint `src/` + i18n audit) |
| Evolution orchestrator smoke | v4 plan OK (prior session) |

## Safe cleanup applied

| Action | Rationale |
|--------|-----------|
| Removed orphan `src/web/main.tsx`, `saved-main.tsx`, `index.html`, `saved.html`, `web.css` | Vite uses `web/` only; duplicates had stale import paths |
| Kept `src/web/kathaWebBridge.ts` | Canonical bridge implementation |
| Removed ESLint override for deleted `src/web/main.tsx` | No longer needed |
| Narrowed `tsconfig` include to `src/web/kathaWebBridge.ts` | Avoid scanning deleted shells |
| Removed `src/web` from Tailwind content globs | No TSX left there |

## Not removed (intentional)

- `backend/cinematic/*` evolution & ultimate modules — production orchestration
- `core/cinematic/`, `core/voice/` — shared types
- `desktop/` — Tauri future shell
- `api/`, `worker/`, `supabase/` — runtime infrastructure
- `CLEANUP_AUDIT_REPORT.md`, `ENGLISH_ONLY_UI_CLEANUP_REPORT.md` — historical audit notes

## Label / UX fixes

| Key | Before | After |
|-----|--------|-------|
| `styleComicPanel` | Watercolor Dreams | Comic Panel |
| `styleCozyStorybook` | Cartoon | Cozy Storybook |
| `userGuideP1–P3`, `helpCenterBlurb` | Generic | Reflects AI cinematic auto-direction |

## User guide updates

- `src/renderer/src/content/userGuideSections.ts` — expanded welcome, AI cinematic systems, projects/continuity, render/export; style names aligned with UI; changelog updated
- In-app access: **Story Monitor → Settings → Open guide** (Help Center)

## Duplicate / review items (no change)

| Item | Recommendation |
|------|----------------|
| `web/web.css` vs deleted `src/web/web.css` | Single copy under `web/` |
| `backend/node_modules` | Isolated backend deps — keep |
| `styleRomanticGlow` i18n key | Unused preset label — harmless |
| ESLint scope | Only `src/` — `api/`/`backend/` JS not linted by root config |
| Bundle size | Main chunk ~126 kB gzip post-split — acceptable |

## Feature inventory (verified by code presence)

- Story stream generation (`kathaPipeline`, `jobs-stream-generate`)
- Cinematic director v4 (`evolutionOrchestrator`)
- Auto voice director + TTS providers
- Subtitle timing adapter + WebVTT export
- Custom style panel + 30-day recent prompts
- Five workspace slots + project memory/world/relationship persistence
- Render worker protocol + Supabase jobs
- i18n + Help Center search
- Post-export cinematic player (atmos, VFX, evolution overlays)

## Environment variables

Documented in `.env.example` and README: `VITE_SUPABASE_*`, `OPENAI/GEMINI/DEEPSEEK`, `LEONARDO`, worker `APP_BASE_URL` + `WORKER_TOKEN`, optional `KATHA_DEV_API_PROXY`.

## Follow-up (optional, not done)

- Extend ESLint to `web/**/*.tsx` for i18n rules
- Consolidate duplicate `styleCozyStorybook` key if resources refactor
- Runtime React Profiler pass for rerender hotspots
- Orphan asset scan under `public/` (manual)
