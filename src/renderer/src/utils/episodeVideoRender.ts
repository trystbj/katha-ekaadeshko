import type { RenderRequest } from '../../../../core/render/types'
import type { BackgroundRenderJob } from '../../../../core/realtime/productionTypes'
import { pollBackgroundRenderJob, queueBackgroundRender } from '../realtime/backgroundRenderQueue'
import { useProductionPipelineStore } from '../store/useProductionPipelineStore'
import { useStudioStore } from '../store/useStudioStore'
import type { ProjectState, StoryEpisode } from '../types/story'
import { pushStoryToCloudIfSignedIn, pushStoryToHistory } from './storyHistory'
import { collectRenderImageUrls } from './collectRenderImageUrls'
import { SECONDS_PER_RENDER_SCENE, cuesFromStudioPrimary } from './scenesWebVtt'
import { resolveCinematicExportPreset } from '@shared/cinematicExportPresets.js'
import { timingOverridesFromPlan } from '../engines/timelineSync'
import { ensureVideoStudio } from './ensureVideoStudio'
import { withRenderComplete, withRenderStarted } from './storyboardWorkflow'

const LOG = '[katha:render]'

type RenderStatusRow = {
  id?: string
  status?: string
  progress?: number
  stage?: string
  video_url?: string
  error?: string
}

const activePolls = new Map<string, ReturnType<typeof setTimeout>>()

function log(event: string, detail?: Record<string, unknown>) {
  if (detail) console.info(LOG, event, detail)
  else console.info(LOG, event)
}

/** Resolve relative `/public/...` paths from the pipeline for worker download. */
export function resolvePipelineAssetUrl(url: string): string {
  const u = url.trim()
  if (!u) return u
  if (/^https?:\/\//i.test(u)) return u
  if (typeof window === 'undefined') return u
  return `${window.location.origin}${u.startsWith('/') ? u : `/${u}`}`
}

function normalizeRenderStatus(raw: string | undefined): BackgroundRenderJob['status'] {
  const s = String(raw || '').toLowerCase()
  if (s === 'done' || s === 'complete' || s === 'completed') return 'complete'
  if (s === 'failed' || s === 'error') return 'failed'
  if (s === 'cancelled') return 'cancelled'
  if (s === 'running' || s === 'processing' || s === 'in_progress') return 'processing'
  return 'queued'
}

async function fetchRenderStatus(jobId: string): Promise<RenderStatusRow | null> {
  try {
    const res = await fetch(`/api/render-status?id=${encodeURIComponent(jobId)}`)
    if (!res.ok) return null
    return (await res.json()) as RenderStatusRow
  } catch {
    return null
  }
}

function persistProject(next: ProjectState) {
  const ix = useStudioStore.getState().activeWorkspaceSlotIndex
  useStudioStore.getState().setWorkspaceProject(ix, next)
  void pushStoryToHistory(next)
  void pushStoryToCloudIfSignedIn(next)
}

function patchActiveProject(fn: (p: ProjectState) => ProjectState) {
  const cur = useStudioStore.getState().project
  if (!cur) return
  const next = fn(cur)
  if (next === cur) return
  persistProject(next)
}

function markEpisodeExportComplete(p: ProjectState, episodeNumber: number): ProjectState {
  let changed = false
  const episodes = p.episodes.map((e) => {
    if (e.number !== episodeNumber) return e
    if (e.videoExportComplete) return e
    changed = true
    return { ...e, videoExportComplete: true }
  })
  return changed ? { ...p, episodes, updatedAt: new Date().toISOString() } : p
}

function buildRenderRequest(project: ProjectState, episode: StoryEpisode | undefined): RenderRequest | null {
  let images = collectRenderImageUrls(project).map(resolvePipelineAssetUrl)
  if (!images.length) return null

  const publish = project.videoStudio?.publish as
    | { cinematicExportPreset?: string; renderMode?: 'full' | 'trailer' }
    | undefined
  const exportPresetId = publish?.cinematicExportPreset || 'youtube_shorts_cinematic'
  const preset = resolveCinematicExportPreset(exportPresetId)
  const secondsPerImage = preset.secondsPerScene

  const plan = episode?.cinematicDirectorPlan as
    | {
        trailerRecap?: { highlightSceneIndices?: number[] }
        orchestration?: { renderAssembly?: Record<string, unknown> }
      }
    | undefined
  const renderAssemblyPlan =
    episode?.renderAssemblyPlan ||
    (plan?.orchestration?.renderAssembly as Record<string, unknown> | undefined)

  const renderMode = publish?.renderMode === 'trailer' ? 'trailer' : 'full'
  const trailerIndices =
    plan?.trailerRecap?.highlightSceneIndices ||
    (renderMode === 'trailer' ? episode?.scenes?.map((s) => s.index).slice(0, 4) : undefined)

  if (renderMode === 'trailer' && trailerIndices?.length) {
    const picked = trailerIndices
      .map((idx) => images[idx - 1])
      .filter((u): u is string => Boolean(u))
    if (picked.length) images = picked
  }

  const scenes = episode?.scenes ?? []
  const vs = ensureVideoStudio(project)
  const subtitlesOn = vs.subtitleStudio.subtitlesOn
  const planTiming = timingOverridesFromPlan(
    episode?.cinematicDirectorPlan as Record<string, unknown> | undefined,
    scenes.length
  )
  const cues = subtitlesOn
    ? cuesFromStudioPrimary(scenes, secondsPerImage, vs.subtitleStudio, undefined, planTiming)
    : []
  const subtitles = cues.map((c) => ({
    startMs: c.startMs,
    endMs: c.endMs,
    text: c.body
  }))
  log('subtitle_render', { subtitlesOn, cueCount: subtitles.length, exportPresetId, renderMode })

  const narrRel = episode?.narrationAudioUrl?.trim()
  const audio = narrRel ? resolvePipelineAssetUrl(narrRel) : undefined
  const bed = episode?.ambientBedUrl?.trim()
  const backgroundMusic = bed ? resolvePipelineAssetUrl(bed) : undefined

  return {
    storyTitle: project.title,
    images,
    ...(audio ? { audio } : {}),
    ...(backgroundMusic ? { backgroundMusic } : {}),
    ...(episode?.storyAudioPlan ? { storyAudioPlan: episode.storyAudioPlan } : {}),
    subtitles,
    fps: preset.fps,
    secondsPerImage,
    ...(renderAssemblyPlan ? { renderAssemblyPlan } : {}),
    cinematicExportPreset: exportPresetId,
    renderMode,
    ...(trailerIndices?.length ? { trailerSceneIndices: trailerIndices } : {})
  }
}

function upsertPipelineJob(job: BackgroundRenderJob) {
  useProductionPipelineStore.getState().upsertBackgroundJob(job)
}

function removePipelineJob(id: string) {
  useProductionPipelineStore.getState().removeBackgroundJob(id)
}

function applyRenderProgress(jobId: string, row: RenderStatusRow) {
  const status = normalizeRenderStatus(row.status)
  const progress = typeof row.progress === 'number' ? row.progress / 100 : 0
  const stage = row.stage || status
  upsertPipelineJob({
    id: jobId,
    projectId: useStudioStore.getState().project?.id ?? '',
    episodeNumber: useStudioStore.getState().selectedEpisode ?? 1,
    status,
    progress,
    stage,
    videoUrl: row.video_url,
    error: row.error,
    queuedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  const st = useStudioStore.getState()
  const ix = st.activeWorkspaceSlotIndex
  st.setWorkspaceJob(ix, {
    id: jobId,
    stage,
    progress: typeof row.progress === 'number' ? row.progress : Math.round(progress * 100),
    log: []
  })
}

function stopPolling(jobId: string) {
  const t = activePolls.get(jobId)
  if (t) clearTimeout(t)
  activePolls.delete(jobId)
}

function schedulePoll(jobId: string, episodeNumber: number) {
  stopPolling(jobId)
  const tick = async () => {
    let row: RenderStatusRow | null = await fetchRenderStatus(jobId)
    if (!row) {
      const polled = await pollBackgroundRenderJob(jobId)
      if (polled) {
        row = {
          id: polled.id,
          status: polled.status,
          progress: Math.round(polled.progress * 100),
          stage: polled.stage,
          video_url: polled.videoUrl,
          error: polled.error
        }
      }
    }
    if (!row) {
      log('poll_miss', { jobId })
      activePolls.set(jobId, setTimeout(tick, 2000))
      return
    }

    const status = normalizeRenderStatus(row.status)
    const videoUrl = row.video_url

    applyRenderProgress(jobId, row)

    if (status === 'complete' && videoUrl) {
      log('render_complete', { jobId, videoUrl })
      log('video_url_created', { jobId, videoUrl })
      stopPolling(jobId)
      removePipelineJob(jobId)

      patchActiveProject((p) => {
        let next: ProjectState = {
          ...p,
          lastRenderVideoUrl: videoUrl,
          renderJobId: undefined,
          updatedAt: new Date().toISOString()
        }
        next = markEpisodeExportComplete(next, episodeNumber)
        log('scene_persistence', {
          projectId: next.id,
          assetCount: next.assets?.length ?? 0,
          sceneAssets: next.assets?.filter((a) => a.kind === 'scene').length ?? 0
        })
        log('export_completion', { episodeNumber, videoExportComplete: true })
        return next
      })

      const st = useStudioStore.getState()
      st.setWorkspaceBusy(st.activeWorkspaceSlotIndex, null)
      if (st.activeWorkspaceSlotIndex === st.activeWorkspaceSlotIndex) {
        st.setBusy(null)
        st.setJob(null)
      }
      return
    }

    if (status === 'failed') {
      log('render_failed', { jobId, error: row.error })
      stopPolling(jobId)
      removePipelineJob(jobId)
      const msg = row.error || 'Video render failed'
      const st = useStudioStore.getState()
      st.setWorkspaceError(st.activeWorkspaceSlotIndex, msg)
      st.setWorkspaceBusy(st.activeWorkspaceSlotIndex, null)
      st.setBusy(null)
      st.setJob(null)
      patchActiveProject((p) => ({ ...p, renderJobId: undefined, updatedAt: new Date().toISOString() }))
      return
    }

    activePolls.set(jobId, setTimeout(tick, 1500))
  }

  void tick()
}

export type QueueEpisodeVideoRenderOpts = {
  project?: ProjectState | null
  episodeNumber?: number
  /** Force a new job even if `renderJobId` is already set. */
  force?: boolean
}

/**
 * Queue worker MP4 render and poll until `lastRenderVideoUrl` is stored on the project.
 * Safe to call after story generation; preserves existing scene assets.
 */
export async function queueEpisodeVideoRender(opts: QueueEpisodeVideoRenderOpts = {}): Promise<string | null> {
  const st = useStudioStore.getState()
  const project = opts.project ?? st.project
  if (!project?.bible) {
    log('queue_skip', { reason: 'no_bible' })
    return null
  }

  const episodeNumber = opts.episodeNumber ?? st.selectedEpisode ?? project.episodes[0]?.number ?? 1
  const episode = project.episodes.find((e) => e.number === episodeNumber)
  const payload = buildRenderRequest(project, episode)
  if (!payload) {
    log('queue_skip', { reason: 'no_images', projectId: project.id })
    return null
  }

  if (project.renderJobId && !opts.force) {
    log('queue_resume', { jobId: project.renderJobId })
    schedulePoll(project.renderJobId, episodeNumber)
    return project.renderJobId
  }

  log('render_start', { projectId: project.id, episodeNumber, imageCount: payload.images.length })

  const ix = st.activeWorkspaceSlotIndex
  st.setWorkspaceBusy(ix, 'rendering')
  st.setWorkspaceError(ix, null)
  if (ix === st.activeWorkspaceSlotIndex) {
    st.setBusy('rendering')
    st.setError(null)
  }

  try {
    const { jobId } = await queueBackgroundRender(project.id, episodeNumber, payload)
    log('render_queued', { jobId })

    patchActiveProject((p) => withRenderStarted({ ...p, renderJobId: jobId }))

    schedulePoll(jobId, episodeNumber)
    return jobId
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    log('render_queue_error', { message: msg })
    st.setWorkspaceError(ix, msg)
    st.setWorkspaceBusy(ix, null)
    st.setBusy(null)
    return null
  }
}

/** Resume polling when a project was saved mid-render (e.g. refresh). */
export function resumeEpisodeVideoRenderIfNeeded(project: ProjectState | null | undefined) {
  if (!project?.renderJobId || project.lastRenderVideoUrl) return
  const ep = project.episodes[0]?.number ?? 1
  log('resume_poll', { jobId: project.renderJobId })
  schedulePoll(project.renderJobId, ep)
}
