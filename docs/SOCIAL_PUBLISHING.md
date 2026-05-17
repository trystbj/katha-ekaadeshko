# Direct Social Media Publishing

Additive distribution layer after cinematic render/export. **Does not** change generation, orchestration, or render pipelines.

## Platforms

- TikTok
- YouTube Shorts
- Instagram Reels
- Facebook Reels

## Modules

| Module | Path |
|--------|------|
| Types | `core/social/socialPublishTypes.ts` |
| Platform adapters | `core/social/platformAdapters.ts` |
| Shorts optimizer | `core/social/shortsOptimizer.ts`, `backend/social/shortsOptimizerEngine.js` |
| Caption generator | `core/social/captionGenerator.ts`, `backend/social/captionGeneratorEngine.js` |
| Export encode hints | `src/renderer/src/utils/publishExportProfiles.ts` (existing) |
| Account storage (local) | `src/renderer/src/social/socialAccounts.ts` |
| Background upload queue | `src/renderer/src/social/uploadQueue.ts` |
| UI | `PublishPanel.tsx`, `SocialPublishExtras.tsx` |

## APIs

- `POST /api/social-shorts-optimize` — viral clip suggestions, thumbnail frame, pacing tips
- `POST /api/social-caption` — AI-ready caption bundle (title, hook, hashtags)

## Workflow

```
Render complete → Post-export workspace → Publish panel
  → Connect accounts (local stub; OAuth-ready)
  → Edit metadata / AI captions
  → Single platform Publish OR multi-platform background queue
  → Platform composer opens + clipboard payload
```

## OAuth

`SocialAccountConnection.tokenRef` reserves token slots. Replace `linkSocialAccount` mock confirm with real OAuth when backend keys are configured.

## Future

- X/Twitter, Discord, scheduling, analytics — extend `SocialPlatformId` + adapters without changing cinematic core.
