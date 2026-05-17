# Engine modules (modular foundation)

Thin **facade layer** over existing systems — no duplicate business logic. Use this folder to discover where engines live and to share **timeline math** between renderer and docs.

## Timeline (shared)

| File | Role |
|------|------|
| `timeline/types.ts` | `PlaybackTimeline`, scene boundaries |
| `timeline/resolvePlaybackTimeline.ts` | Plan → playback boundaries + subtitle lead-in |

Renderer: `src/renderer/src/engines/timelineSync.ts`  
Backend: `backend/cinematic/timelineOrchestrator.js` (builds plan layers)

## Backend engines (unchanged paths)

- **Cinematic** — `backend/cinematic/` (director v2, orchestrator v3, evolution v4)
- **Narration** — `backend/voice/`, `backend/services/ttsService.js`
- **Audio mix** — `buildStoryAudioPlan`, `emotionalAudioMixer.js`
- **Pipeline** — `backend/orchestrator/kathaPipeline.js`
- **Render** — `api/render`, `worker/worker.js`

## Renderer engines

- **Subtitles** — `utils/scenesWebVtt.ts` + `voice/subtitleTimingAdapter.ts`
- **Playback** — `cinematic/useCinematicScene.ts`, `CinematicVideoPlayer.tsx`
- **Style** — `types/story.ts` (`STYLE_PRESETS`)
- **Project** — `store/useStudioStore.ts`, workspace slots

## Rules

- Add new provider adapters under existing `providers/` folders — do not hardcode vendors in UI.
- Extend timeline via `resolvePlaybackTimeline` when plan schema grows.
- Do not fork orchestration; wrap and re-export.
