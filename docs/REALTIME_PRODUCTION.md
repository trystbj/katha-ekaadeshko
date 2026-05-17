# Real-Time Cinematic Production

Additive layer on top of the existing orchestration pipeline. **Does not** replace `buildSceneOrchestratedPlan` or automatic generation.

## Modules

| Module | Location |
|--------|----------|
| Types | `core/realtime/productionTypes.ts` |
| Preview quality profiles | `core/realtime/previewQualityProfiles.ts` |
| Device auto-optimization | `core/realtime/autoOptimization.ts` |
| Live director (patch plan) | `core/realtime/liveDirectorEngine.ts` |
| Realtime timeline snapshot | `core/realtime/realtimeTimeline.ts` |
| Emotion arc visualizer data | `core/realtime/emotionVisualizer.ts` |
| Live feedback analyzer | `core/realtime/liveFeedbackAnalyzer.ts` |
| Live feedback API | `api/realtime-feedback.js` |
| Preview bus | `src/renderer/src/realtime/livePreviewBus.ts` |
| Production store | `src/renderer/src/store/useProductionPipelineStore.ts` |
| Background render queue | `src/renderer/src/realtime/backgroundRenderQueue.ts` |

## Workflow

1. AI generates episode + `cinematicDirectorPlan` (unchanged).
2. Creator edits in **Creator studio** → `bumpLivePreview()` → `liveRevision` increments.
3. **CinematicVideoPlayer** recomputes WebVTT + timeline from plan without full regen.
4. **Quick / Production** mode adjusts preview VFX density via `resolvePreviewQualityProfile`.
5. Optional background render via `webRenderAdapter` + `pollBackgroundRenderJob`.

## UI

- **Live production bar** — post-export workspace (mode + preview tier + render badge).
- **Creator studio → Live tab** — emotion visualizer + live feedback strip.
- **CinematicVideoPlayer** — `liveTimelineRevision` prop for sync refresh.

## Future

- Collaborative editing: `ProductionPipelineProjectState.collaboration` schema stub on `ProjectState`.
- Wire `queueBackgroundRender` from export dock without blocking UI.
- Tauri: same store + adapters, local render queue.
