# Creator Studio (AI + Creator Hybrid)

Katha Ekadeshko keeps the automatic cinematic pipeline unchanged. Creator Studio is a **refinement layer** on top of generated episodes.

## Workflow

```
Story → AI generation → Scene orchestration → Timeline sync
         ↓ (optional)
Scene edit → Smart regen plan → Co-pilot patches → Quality review → Export
```

## Modules

| Module | Path |
|--------|------|
| Types | `core/studio/creatorStudioTypes.ts` |
| Co-pilot engine | `backend/creator/copilotCommandEngine.js` |
| Regeneration planner | `backend/creator/sceneRegenerationEngine.js` |
| Quality analyzer | `backend/creator/qualityAnalyzer.js` |
| Presets | `backend/creator/creatorPresets.js` |
| APIs | `api/creator-copilot.js`, `api/creator-scene-regenerate.js`, `api/creator-quality.js` |
| UI | `src/renderer/src/components/CreatorStudioPanel.tsx` |
| History (undo/redo) | `src/renderer/src/creator/creatorHistory.ts` |

## Non-destructive edits

- `project.creatorStudio` stores overrides, presets, and up to 24 history snapshots.
- Undo/redo restores episode snapshots without touching the core orchestration entry point.

## UI (monitor column)

When an episode has scenes, the **Creator studio** panel offers:

- **Storyboard** — scene cards with beat and duration
- **Scene** — text edit + partial regen targets
- **Timeline** — lightweight layer bars per scene
- **Co-pilot** — natural-language patches via `/api/creator-copilot`
- **Quality** — heuristic review via `/api/creator-quality`
- **Export** — hints; full MP4 remains in post-export workspace

## Future hooks

Regeneration APIs return job plans; Leonardo/TTS/render workers can consume them without changing the orchestrator.
