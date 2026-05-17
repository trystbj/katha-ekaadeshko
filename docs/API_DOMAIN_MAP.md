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

Implement handlers under `api/_routes/` and register in `api/gateway.js`. Vercel Hobby allows **12** serverless files in `api/`; this project uses **one** gateway + rewrites so all legacy `/api/*` URLs still work.

Shared utilities: `api/_lib/http.js` (`createJsonHandler`).
