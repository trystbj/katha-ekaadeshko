# API domain map (Vercel routes)

Routes stay at **existing URLs** for zero-downtime deploys. Logical domains map as follows:

| Domain | Routes | Shared lib |
|--------|--------|------------|
| **story** | `jobs-stream-generate` | `backend/orchestrator/kathaPipeline.js` |
| **narrator** | `narrator-preview` | `backend/services/narratorPreviewTts.js` |
| **animation** | `leonardo-generate` | Leonardo service |
| **subtitles** | (in pipeline + player) | `scenesWebVtt` renderer |
| **render** | `render`, `render-status`, `worker-*` | `_renderSupabase.js` |
| **projects** | `projects-list`, `projects-get`, `projects-save`, `projects-delete` | Supabase |
| **publish** | `social-caption`, `social-shorts-optimize` | `backend/social/` |
| **creator** | `creator-copilot`, `creator-quality`, `creator-scene-regenerate`, `realtime-feedback` | `backend/creator/` |
| **system** | `health`, `ui-i18n-bundle` | `api/_lib/` |

New routes must use `api/_lib/http.js` (`createJsonHandler`). Exceptions: `jobs-stream-generate` (SSE), `narrator-preview` (binary), `ui-i18n-bundle` (static JSON bundle).
