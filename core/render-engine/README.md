# Render engine (modular map)

Production rendering stays in existing paths; this folder documents the module map for future FFmpeg/GPU work.

| Module | Current implementation |
|--------|-------------------------|
| browser-renderer | `CinematicVideoPlayer`, `useCinematicScene`, CSS overlays |
| timeline-engine | `core/engines/timeline/resolvePlaybackTimeline.ts`, `timelineSync.ts` |
| subtitle-renderer | `scenesWebVtt.ts`, `SubtitleStudioPanel` |
| render-queue | `api/render.js`, `worker/worker.js`, `web/adapters/webRenderAdapter.ts` |
| export-manager | `VideoEditorPublishDock`, `publishExportProfiles.ts` |
| future-ffmpeg-renderer | `worker/worker.js` (FFmpeg today; extract here later) |

Do not duplicate logic — extend worker and `core/render/types.ts` when adding chunk/GPU paths.
