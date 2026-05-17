# AI cinematic generation pipeline

Unified scene-based orchestration — **additive** on existing v4 systems.

## Flow

```
Story input (API)
  → Story / script generation (existing kathaPipeline)
  → buildSceneOrchestratedPlan()
       ├─ buildEvolutionCinematicPlan (v4: camera, acting, memory, world, …)
       ├─ Scene breakdown (beat types per script row)
       ├─ Emotion profiles
       ├─ Narration orchestration plan
       ├─ Scene transitions
       ├─ Master timeline v2 (cumulative ms + transitions)
       └─ Render assembly plan (worker-ready slots)
  → metadata + episode cinematicDirectorPlan
```

## Module map

| Engine | Path |
|--------|------|
| Pipeline entry | `backend/cinematic/pipeline/sceneOrchestrationPipeline.js` |
| Scene breakdown | `sceneBreakdownEngine.js` |
| Emotion | `emotionAnalysisEngine.js` |
| Narration | `narrationPlanningEngine.js` |
| Transitions | `transitionDirector.js` |
| Master timeline | `synchronizedMasterTimeline.js` |
| Render assembly | `renderAssemblyEngine.js` |
| Legacy per-layer | `backend/cinematic/*` (unchanged) |

## Client consumption

- `cinematicDirectorPlan.orchestration` — full plan
- `cinematicDirectorPlan.masterTimeline` — sync v2 summary
- Renderer: `core/engines/timeline/resolvePlaybackTimeline.ts` uses orchestration boundaries when present

## Provider rules

Slots are symbolic (`tts:default`, `leonardo:default`, `worker:ffmpeg`) — swap providers without changing orchestration shape.
