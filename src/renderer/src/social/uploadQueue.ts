import { getPlatformAdapter } from '../../../../core/social/platformAdapters'
import type { SocialPublishJob, SocialPlatformId } from '../../../../core/social/socialPublishTypes'
import type { PublishDraft } from '../types/videoStudio'
import { publishEncodePlanClipboardBlock, resolvePublishEncodePlan } from '../utils/publishExportProfiles'
import { useSocialPublishStore } from '../store/useSocialPublishStore'

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function jobId(platform: SocialPlatformId) {
  return `pub_${platform}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

async function copyPublishClipboard(publish: PublishDraft, platform: SocialPlatformId): Promise<void> {
  const encodePlan = resolvePublishEncodePlan(platform, publish.exportQualityMode ?? 'maximum')
  const body = [
    publish.title,
    '',
    publish.hookLine,
    '',
    publish.description,
    '',
    publish.hashtags,
    '',
    publishEncodePlanClipboardBlock(encodePlan)
  ].join('\n')
  try {
    await navigator.clipboard.writeText(body)
  } catch {
    /* ignore */
  }
}

/**
 * Background publish simulation — opens platform composer, non-blocking for UI.
 */
export async function enqueueBackgroundPublish(input: {
  platforms: SocialPlatformId[]
  projectId: string
  videoUrl: string
  publish: PublishDraft
  onStage?: (job: SocialPublishJob) => void
}): Promise<void> {
  const upsert = useSocialPublishStore.getState().upsertJob

  for (const platform of input.platforms) {
    const id = jobId(platform)
    const now = new Date().toISOString()
    const stages: Array<{ status: SocialPublishJob['status']; progress: number; stage: string; detail: string; ms: number }> = [
      { status: 'preparing', progress: 0.15, stage: 'prepare', detail: 'Packaging metadata', ms: 400 },
      { status: 'optimizing', progress: 0.35, stage: 'optimize', detail: 'Platform encode hints', ms: 450 },
      { status: 'uploading', progress: 0.65, stage: 'upload', detail: 'Opening composer', ms: 500 },
      { status: 'processing', progress: 0.85, stage: 'process', detail: 'Awaiting confirmation', ms: 350 }
    ]

    void (async () => {
      let job: SocialPublishJob = {
        id,
        platform,
        projectId: input.projectId,
        videoUrl: input.videoUrl,
        status: 'queued',
        progress: 0,
        stage: 'queued',
        detail: '',
        queuedAt: now,
        updatedAt: now
      }
      upsert(job)
      input.onStage?.(job)

      for (const row of stages) {
        await sleep(row.ms)
        job = {
          ...job,
          status: row.status,
          progress: row.progress,
          stage: row.stage,
          detail: row.detail,
          updatedAt: new Date().toISOString()
        }
        upsert(job)
        input.onStage?.(job)
      }

      await copyPublishClipboard(input.publish, platform)
      const adapter = getPlatformAdapter(platform)
      window.open(adapter.composerUrl, '_blank', 'noopener,noreferrer')

      job = {
        ...job,
        status: 'published',
        progress: 1,
        stage: 'done',
        detail: adapter.label,
        updatedAt: new Date().toISOString()
      }
      upsert(job)
      input.onStage?.(job)
    })()
  }
}
