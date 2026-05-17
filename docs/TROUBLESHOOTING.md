# Troubleshooting Guide

Consolidated playbooks for production support. The in-app **Help Center** (Story Monitor → Settings → Open guide) mirrors these topics.

## App & API

| Symptom | Fix |
|---------|-----|
| Settings shows **Offline** | Use `npm run dev:vercel`, or set `KATHA_DEV_API_PROXY` in `.env.local` to your deployed URL |
| Generate fails immediately | Set at least one of `OPENAI_API_KEY`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY` on Vercel |
| Stream stops mid-generation | Check network; retry Generate; workspace autosave retains slot state |
| Old UI after deploy | Hard refresh (Ctrl+Shift+R); confirm header build badge matches `uiBuild.ts` |

## Narration & audio

| Symptom | Fix |
|---------|-----|
| No narration audio | TTS requires online API keys; verify serverless env on Vercel |
| Voice preview fails | Check browser autoplay policy; verify TTS provider keys |
| Audio out of sync with video | Re-render after narration changes; ensure worker uses latest `storyAudioPlan` |

## Subtitles & playback

| Symptom | Fix |
|---------|-----|
| Subtitle drift | Regenerate episode or adjust subtitle studio timing; creator co-pilot can shift lead-in |
| Captions missing in player | Enable subtitles toggle; check WebVTT generation in post-export workspace |
| Timeline scrub wrong | Ensure `cinematicDirectorPlan` present; live revision bumps after creator edits |

## Render & export

| Symptom | Fix |
|---------|-----|
| Render stuck queued | Start local worker with matching `WORKER_TOKEN` |
| `render_jobs` column errors | Run `supabase/render_jobs_add_missing_columns.sql` in Supabase SQL editor |
| Worker claim 500 / id validation | Redeploy latest `api/worker-claim.js` (short numeric ids supported) |
| Export MP4 low quality | Use maximum export quality in publish panel; avoid re-encoding previews |

## Projects & save

| Symptom | Fix |
|---------|-----|
| Cloud project won't load | Sign in again; incomplete payloads are repaired via `repairProjectOnLoad` |
| Lost edits | Check workspace slot autosave; five parallel slots keep separate state |
| Corrupt bible | Start new workspace slot; export Markdown backup when available |

## Social publishing

| Symptom | Fix |
|---------|-----|
| Publish blocked | Connect platform account (local link stub until OAuth configured) |
| Clipboard empty | Allow clipboard permission; retry publish flow |
| Wrong aspect | Generate with vertical 9:16 early in pipeline |

## Desktop (Tauri)

| Symptom | Fix |
|---------|-----|
| `cargo tauri` not found | `cargo install tauri-cli --version "^2"` |
| Blank window in dev | Ensure `npm run web:dev` reachable at port 4173 |
| Blank window in prod build | Run `npm run build` before `npm run desktop:build` |

## Performance

- Enable **Quick** mode in live production bar for lighter preview VFX.
- Close unused workspace slots during heavy renders.
- Prefer local worker on the same machine as the browser for large episodes.

## Getting help

1. Note build badge version and browser/OS.
2. Check Vercel function logs for `/api/jobs-stream-generate` errors.
3. Export Markdown script as backup before destructive retries.
