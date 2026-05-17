# Cinematic director (Phase 2 Final Evolution)

AI cinematic universe engine: reasoning, world simulation, relationships, director personality, symbolism, memory sequences, art evolution, and future-ready render/interactive/lip-sync foundations.

## Layering

| Version | Orchestrator | Scope |
|---------|--------------|--------|
| v2 | `cinematicDirector.js` | Expression, ambience, environment, motion, audio mix |
| v3 | `cinematicOrchestrator.js` | Camera, acting, memory, music, timeline, VFX |
| v4 | `evolutionOrchestrator.js` | Reasoning, world, relationships, symbolism, flashbacks, art evolution |

Pipeline entry: `kathaPipeline.js` → `buildSceneOrchestratedPlan()` (`backend/cinematic/pipeline/`).

Unified flow: scene breakdown → emotion → narration plan → transitions → master timeline v2 → render assembly (wraps v4 evolution).

## Backend (`backend/cinematic/`)

### v3 (Ultimate)
`cameraDirector.js`, `characterActing.js`, `storyMemoryContinuity.js`, `storyPacingEngine.js`, `cinematicMusicDirector.js`, `sceneComposition.js`, `visualEffectsDirector.js`, `timelineOrchestrator.js`, `cliffhangerDirector.js`, `multiCharacterVoice.js`, `smartPerformance.js`, `communityFoundation.js`

### v4 (Evolution)
| Module | Role |
|--------|------|
| `cinematicReasoningEngine.js` | Per-scene orchestration state; fuses all layers |
| `worldSimulation.js` | Persistent world history, weather, war, corruption |
| `emotionalRelationshipEngine.js` | Trust, rivalry, romance, trauma graph |
| `directorPersonality.js` | Hollywood / anime / cozy / dark / etc. profiles |
| `flashbackDreamEngine.js` | Flashback, dream, nightmare treatments |
| `symbolismThematic.js` | Themes, motifs, color/lighting symbolism |
| `dynamicArtEvolution.js` | Grading progression across episode |
| `advancedRenderPipeline.js` | Bloom, fog, LUT slots (future render APIs) |
| `trailerRecapDirector.js` | Highlight scenes, teaser/recap metadata |
| `interactiveStoryFoundation.js` | Branching architecture stub |
| `lipSyncFoundation.js` | Per-character lip-sync provider slots |
| `creatorPreferenceLearning.js` | Learned pacing/tone/intensity per creator |

## Renderer

- `environmentCss.ts`, `cameraVfxCss.ts`, `evolutionCss.ts`
- `smartPerformance.ts`, `useCinematicScene.ts`
- Overlays: `.cinematic-player__atmos`, `__vfx`, `__evo`

## Types

- `core/cinematic/types.ts` — base plan (version 2 \| 3 \| 4)
- `core/cinematic/ultimateTypes.ts` — v3 scene extensions
- `core/cinematic/evolutionTypes.ts` — v4 extensions

## Project persistence (automatic)

After each generation, metadata patches: `memorySummaryPatch`, `worldStateSnapshot`, `relationshipSnapshot`, `creatorPreferencesPatch`. Next generation sends these as `prior*` fields for continuity.

## UX

No new manual panels. Director personality defaults from `styleId` + genre (`auto`). Optional API: `directorPersonalityPreference`.
