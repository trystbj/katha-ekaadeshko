# Scene orchestration pipeline

Unified AI cinematic generation flow — **additive** layer on v4 evolution director.

## Entry

`sceneOrchestrationPipeline.js` → `buildSceneOrchestratedPlan(params)`

Called from `kathaPipeline.js` after script + audio plan exist.

## Stages

| Stage | Module |
|-------|--------|
| Cinematic director v4 | `../evolutionOrchestrator.js` |
| Scene breakdown | `sceneBreakdownEngine.js` |
| Emotion analysis | `emotionAnalysisEngine.js` |
| Narration planning | `narrationPlanningEngine.js` |
| Transitions | `transitionDirector.js` |
| Master timeline v2 | `synchronizedMasterTimeline.js` |
| Render assembly | `renderAssemblyEngine.js` |

## Outputs (metadata)

- `cinematicDirectorPlan.orchestration` — full `SceneOrchestrationPlan`
- `cinematicDirectorPlan.masterTimeline` — sync v2 summary
- `metadata.sceneOrchestration` — duplicate for clients
- `metadata.renderAssemblyPlan` — worker/export hints

## Types

`core/cinematic/pipelineTypes.ts`

## Renderer

`core/engines/timeline/resolvePlaybackTimeline.ts` prefers `plan.orchestration.masterTimeline.sceneBoundaries` when present.
