# Katha Ekadeshko — Architecture overview

## Stack

| Layer | Path | Role |
|-------|------|------|
| Web shell | `web/` | Vite entry (`index.html`, `main.tsx`), re-exports bridge |
| Bridge | `src/web/kathaWebBridge.ts` | `window.katha`, Supabase client, persistence adapters |
| Renderer | `src/renderer/src/` | React UI, Zustand store, i18n, styles |
| Shared types | `core/`, `shared/` | Cross-target contracts (cinematic, voice) |
| API | `api/` | Vercel serverless (generate stream, render, projects) |
| Backend | `backend/` | Story pipeline, cinematic engines, TTS, Leonardo |
| Worker | `worker/` | FFmpeg render queue consumer |
| Desktop | `desktop/src-tauri/` | Tauri 2 shell → `web-dist/` (hybrid release) |

## Generation flow

1. **Client** — `useBackendGenerate` → `POST /api/jobs-stream-generate` with theme, genre, style, language, memory/world prefs.
2. **Pipeline** — `backend/orchestrator/kathaPipeline.js`: story → validate/enhance → script → images + TTS → `buildEvolutionCinematicPlan` (v4).
3. **Metadata** — `cinematicDirectorPlan`, `storyAudioPlan`, memory/world/relationship patches returned to client.
4. **Render** — Client queues `/api/render`; **worker** builds MP4 from stills + audio plan.

## Cinematic systems (modular)

Layered orchestrators (do not remove — future APIs plug in via provider slots):

- **v2** `cinematicDirector.js` — expression, ambience, environment, motion
- **v3** `cinematicOrchestrator.js` — camera, acting, music, timeline, VFX
- **v4** `evolutionOrchestrator.js` — reasoning, world, relationships, symbolism, flashbacks

See `core/cinematic/README.md` for module list.

## Voice

- `backend/voice/` — director + provider registry (`openaiTtsProvider`, extensible)
- `core/voice/types.ts` — shared contracts

## State

- **Global UI** — `useStudioStore` (Zustand), disk-backed workspace slots
- **Project** — `ProjectState` in `types/story.ts` (episodes, memory, world, preferences)

## i18n

- UI strings: `src/renderer/src/i18n/translations/en.ts`
- Rule: no raw JSX literals (`eslint` + `scripts/i18n-audit.mjs`)
- Help Center: `content/userGuideSections.ts` (English structured sections)

## Config

- `vite.web.config.ts` — root `web/`, out `web-dist/`
- `vercel.json` — serverless routes
- `.env.example` — keys reference

## What not to break

- Provider abstraction (TTS, future lip-sync, render)
- Cinematic plan versions on episodes (`cinematicDirectorPlan`)
- Worker render contract (`storyAudioPlan.segments`)
- Five workspace slots + cloud project sync
