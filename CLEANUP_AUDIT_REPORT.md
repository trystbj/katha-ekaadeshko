# Katha Ekadeshko — Deep Cleanup Audit (project-wide)

Branch: `refactor/project-deep-cleanup`  
Date: 2026-05-10  
Scope: Static analysis, build/lint/typecheck, architecture review. No destructive deletes applied.

---

## A) KEEP (core architecture — do not remove)

| Area | Path / artifact | Notes |
|------|-----------------|--------|
| Web shell (Vite root) | `web/` | `index.html`, `saved.html`, `main.tsx`, `kathaWebBridge.ts` re-export, `adapters/` |
| Bridge implementation | `src/web/kathaWebBridge.ts` | Supabase + `window.katha`; consumed by `web/kathaWebBridge.ts` |
| Renderer / UI | `src/renderer/src/` | Components, hooks, store, i18n, styles, prompts, types |
| Shared / core | `shared/`, `core/` | Cross-target logic; Tauri/desktop migration notes in `core/README.md` |
| API (Vercel serverless) | `api/` | Zod validation; **not** linted by root ESLint (see ignores) |
| Backend (Express-style) | `backend/` | Orchestrator, pipelines, services; separate `node_modules` |
| Worker | `worker/` | Queue / render worker |
| Supabase SQL | `supabase/schema.sql`, migrations | Source of truth for DB; verify vs prod |
| Desktop shell | `desktop/src-tauri/` | Future Tauri wrapper |
| Config | `vite.web.config.ts`, `vite.config.ts`, `vercel.json`, `tailwind.config.js`, `tsconfig.json` |
| i18n pipeline | `src/renderer/src/i18n/`, `scripts/i18n-audit.mjs`, `eslint-rules/katha-i18n-plugin.cjs` | Mandatory localization rules |

---

## B) DELETE SAFE (low risk if not referenced)

| Item | Reason |
|------|--------|
| `web-dist/` | Build output; already in `.gitignore`; regenerate with `npm run web:build` |
| `*.tsbuildinfo` | TypeScript incremental cache (now ignored) |
| Root `node_modules/` | Reinstall with `npm ci` (never commit) |

**Not deleted in this pass:** confirm no CI relies on checking in `web-dist`.

---

## C) DELETE REVIEW (risky — human decision)

| Item | Risk |
|------|------|
| `src/web/main.tsx`, `src/web/index.html`, `src/web/saved.html`, `src/web/saved-main.tsx` | Parallel copies of `web/` entries; **Vite uses `web/` only**. Removing requires updating `tsconfig` include, `tailwind` content, README, and eslint override for `src/web/main.tsx`. |
| `src/web/web.css` vs `web/web.css` | Keep in sync or consolidate into one tree. |
| `build/` | Could be generated assets (images); audit contents before delete — now gitignored if recreated. |
| `backend/node_modules/` | Nested install; intentional for backend isolation — do not delete without documenting how backend runs. |

---

## D) FIXED AUTOMATICALLY (this branch)

| Change | File(s) |
|--------|---------|
| Tailwind scan included Vite root shell | `tailwind.config.js` — added `./web/**/*.{ts,tsx}` |
| Correct re-export comment | `vite.config.ts` — app root is `web/`, not `src/web` |
| Vendor code-splitting + warning threshold | `vite.web.config.ts` — `manualChunks` for react, framer-motion, i18next stack, zustand; `chunkSizeWarningLimit: 650`; removed empty `@supabase` chunk attempt |
| Ignore local env + build noise | `.gitignore` — `.env.local`, `.env.*.local`, `build/`, `*.tsbuildinfo` |
| ESLint auto-fix | `npx eslint src --fix` (no remaining fixable diffs that changed repo in last run) |

**Build result (after split):** main app chunk `kathaWebBridge-*.js` ~417 kB gzip ~133 kB (was ~737 kB single chunk before vendor split).

---

## E) NEED MANUAL REVIEW

| Topic | Detail |
|-------|--------|
| ESLint coverage gap | `eslint.config.mjs` only targets `src/**/*.ts(x)`. Root `web/**/*.tsx` is **not** under `jsx-no-literals` / i18n rules — consider extending `files` + ignores carefully. |
| `backend/`, `api/`, `worker/` JS | Excluded from TS strict checks; run targeted lint or add `eslint.config` flat entries if desired. |
| Supabase schema vs client | Compare `supabase/schema.sql` + `render_jobs_add_missing_columns.sql` to live DB and `src/renderer` types (`story.ts`, store). |
| Secrets / env | Audit `.env.example` vs Vercel/env docs; ensure no secrets in repo; `api-keys.local.env` gitignored. |
| Duplicate shell (`src/web` vs `web`) | Pick single source of truth for HTML entrypoints to avoid drift. |
| Security | API routes use Zod — review auth on each handler (`Authorization`, service role). No automated OWASP scan run. |
| Orphan assets | `public/` — cross-reference imports in renderer; unused images/audio not exhaustively traced. |
| Memory leaks / infinite rerenders | Requires runtime profiling (React Profiler); not verified statically. |

---

## F) PERFORMANCE IMPROVEMENTS

| Improvement | Status |
|-------------|--------|
| Vendor `manualChunks` (react, motion, i18n, zustand) | Applied |
| Lazy `import()` for heavy routes / modals | **Proposed** — reduces initial JS; requires careful Suspense boundaries |
| Lazy Monaco / heavy editors if added later | **Proposed** |
| Tailwind JIT includes `web/` | Applied — avoids missing utility classes in shell |
| Supabase client stays in main chunk | Acceptable — splitting produced empty vendor chunk |

---

## G) FINAL CLEAN PROJECT TREE (logical layout)

```
katha-ekaadeshko/
├── api/                 # Vercel serverless handlers (JS + Zod)
├── backend/             # Node orchestrator, services, routes (own node_modules)
├── build/               # Generated/build artifacts (review before commit)
├── core/                # Portable core logic (Tauri-ready direction)
├── desktop/             # Tauri scaffold (src-tauri)
├── eslint-rules/        # Custom i18n ESLint plugin
├── public/              # Static assets served by Vite
├── scripts/             # i18n audit, tooling
├── shared/              # Shared modules
├── src/
│   ├── renderer/src/    # React app (main UI)
│   └── web/             # Bridge impl + legacy duplicate shell files (see C)
├── supabase/            # schema.sql, SQL patches
├── web/                 # Vite root: HTML + entrypoints + adapters (canonical shell)
├── web-dist/            # Production build output (gitignored)
├── worker/              # Background worker
├── vite.config.ts       # Re-exports vite.web.config
├── vite.web.config.ts     # Primary Vite config
├── package.json
├── tsconfig.json
├── vercel.json
├── tailwind.config.js
└── postcss.config.js
```

---

## Verification commands

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint src + i18n-audit
npm run web:build   # vite build → web-dist/
```

---

## Constraints respected

- Narrator system, story generation, episode pipeline, render queue, multi-project architecture, localization/theme, Supabase — **no features removed**.
- Web app mode preserved; Tauri paths (`core/`, `desktop/`) untouched.
