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
import { formatApiError } from './formatApiError'
import { serializePipelineError } from './studioTaskState'

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
const RENDER_POLL_TIMEOUT_MS = 45 * 60 * 1000
const pollStartedAt = new Map<string, number>()
const RENDER_MAX_QUEUE_RETRIES = 2
const RENDER_MAX_JOB_RETRIES = 1
const RENDER_STUCK_PROGRESS_TICKS = 24
const RENDER_POLL_MISS_WARN = 20

type RenderCheckpoint =
  | 'precheck'
  | 'queued'
  | 'polling'
  | 'downloading'
  | 'encoding'
  | 'complete'
  | 'failed'
  | 'retry'
  | 'stalled'

type PollSession = {
  episodeNumber: number
  queueRetries: number
  jobRetries: number
  pollMisses: number
  lastProgress: number
  lastProgressTicks: number
}

const pollSessions = new Map<string, PollSession>()

function logCheckpoint(jobId: string, checkpoint: RenderCheckpoint, detail?: Record<string, unknown>) {
  log(`checkpoint_${checkpoint}`, { jobId, ...detail })
}

function isRetryableRenderError(message: string): boolean {
  const m = String(message || '').toLowerCase()
  if (!m) return true
  return (
    m.includes('timeout') ||
    m.includes('network') ||
    m.includes('fetch') ||
    m.includes('econn') ||
    m.includes('worker') ||
    m.includes('503') ||
    m.includes('502') ||
    m.includes('504') ||
    m.includes('download') ||
    m.includes('ffmpeg') ||
    m.includes('stuck')
  )
}

function inferCheckpointFromStage(stage: string, status: BackgroundRenderJob['status']): RenderCheckpoint {
  const s = String(stage || '').toLowerCase()
  if (status === 'complete') return 'complete'
  if (status === 'failed') return 'failed'
  if (s.includes('download') || s.includes('image')) return 'downloading'
  if (s.includes('encod') || s.includes('mux') || s.includes('subtitle') || s.includes('audio')) {
    return 'encoding'
  }
  return 'polling'
}

type RenderPrecheck = { ok: true; imageCount: number } | { ok: false; reason: string }

function validateRenderPayload(payload: RenderRequest): RenderPrecheck {
  const images = Array.isArray(payload.images) ? payload.images : []
  if (!images.length) return { ok: false, reason: 'No scene images to render.' }
  const bad = images.filter((u) => {
    const t = String(u || '').trim()
    return !t || (!/^https?:\/\//i.test(t) && !t.startsWith('/'))
  })
  if (bad.length) {
    return { ok: false, reason: `${bad.length} scene image URL(s) are invalid or unreachable.` }
  }
  return { ok: true, imageCount: images.length }
}

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
  pollStartedAt.delete(jobId)
  pollSessions.delete(jobId)
}

async function requeueRenderAfterFailure(
  priorJobId: string,
  episodeNumber: number,
  reason: string
): Promise<boolean> {
  const session = pollSessions.get(priorJobId)
  if (!session || session.jobRetries >= RENDER_MAX_JOB_RETRIES) return false

  const project = useStudioStore.getState().project
  if (!project?.bible) return false
  const episode = project.episodes.find((e) => e.number === episodeNumber)
  const payload = buildRenderRequest(project, episode)
  const pre = payload ? validateRenderPayload(payload) : { ok: false as const, reason: 'No render payload' }
  if (!pre.ok) {
    log('render_retry_skip', { priorJobId, reason: pre.reason })
    return false
  }

  session.jobRetries += 1
  logCheckpoint(priorJobId, 'retry', {
    episodeNumber,
    attempt: session.jobRetries,
    priorError: reason.slice(0, 200)
  })

  stopPolling(priorJobId)
  patchActiveProject((p) => ({ ...p, renderJobId: undefined, updatedAt: new Date().toISOString() }))

  try {
    const { jobId } = await queueBackgroundRender(project.id, episodeNumber, payload)
    log('render_retry_queued', { priorJobId, jobId, attempt: session.jobRetries })
    patchActiveProject((p) => withRenderStarted({ ...p, renderJobId: jobId }))
    schedulePoll(jobId, episodeNumber, session.jobRetries, session.queueRetries)
    return true
  } catch (e) {
    const msg = serializePipelineError(e, 'Video render retry failed')
    log('render_retry_queue_error', { message: msg })
    return false
  }
}

function clearRenderBusyState() {
  const st = useStudioStore.getState()
  const ix = st.activeWorkspaceSlotIndex
  st.setWorkspaceBusy(ix, null)
  st.setBusy(null)
  st.setJob(null)
}

function schedulePoll(
  jobId: string,
  episodeNumber: number,
  jobRetries = 0,
  queueRetries = 0
) {
  stopPolling(jobId)
  pollStartedAt.set(jobId, Date.now())
  pollSessions.set(jobId, {
    episodeNumber,
    queueRetries,
    jobRetries,
    pollMisses: 0,
    lastProgress: -1,
    lastProgressTicks: 0
  })

  const tick = async () => {
    const session = pollSessions.get(jobId)
    if (!session) return

    const started = pollStartedAt.get(jobId) ?? Date.now()
    if (Date.now() - started > RENDER_POLL_TIMEOUT_MS) {
      logCheckpoint(jobId, 'failed', { reason: 'timeout' })
      const retried = await requeueRenderAfterFailure(jobId, episodeNumber, 'Render timed out')
      if (retried) return
      stopPolling(jobId)
      removePipelineJob(jobId)
      const msg = 'Video render timed out — try again or check the worker.'
      useStudioStore.getState().setWorkspaceError(useStudioStore.getState().activeWorkspaceSlotIndex, msg)
      clearRenderBusyState()
      patchActiveProject((p) => ({ ...p, renderJobId: undefined, updatedAt: new Date().toISOString() }))
      return
    }

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
      session.pollMisses += 1
      if (session.pollMisses === RENDER_POLL_MISS_WARN) {
        log('poll_miss_warn', { jobId, misses: session.pollMisses })
      }
      log('poll_miss', { jobId, misses: session.pollMisses })
      activePolls.set(jobId, setTimeout(tick, 2000))
      return
    }

    session.pollMisses = 0
    const status = normalizeRenderStatus(row.status)
    const videoUrl = row.video_url
    const progress = typeof row.progress === 'number' ? row.progress : 0
    const checkpoint = inferCheckpointFromStage(row.stage || '', status)
    logCheckpoint(jobId, checkpoint, { progress, stage: row.stage, status })

    if (status === 'processing' || status === 'queued') {
      if (progress === session.lastProgress) {
        session.lastProgressTicks += 1
        if (session.lastProgressTicks >= RENDER_STUCK_PROGRESS_TICKS) {
          logCheckpoint(jobId, 'stalled', { progress, stage: row.stage, ticks: session.lastProgressTicks })
        }
      } else {
        session.lastProgress = progress
        session.lastProgressTicks = 0
      }
    }

    applyRenderProgress(jobId, row)

    if (status === 'complete' && videoUrl) {
      logCheckpoint(jobId, 'complete', { videoUrl })
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

      clearRenderBusyState()
      return
    }

    if (status === 'failed') {
      const errText = String(row.error || 'Video render failed')
      log('render_failed', { jobId, error: errText })
      if (isRetryableRenderError(errText)) {
        const retried = await requeueRenderAfterFailure(jobId, episodeNumber, errText)
        if (retried) return
      }
      stopPolling(jobId)
      removePipelineJob(jobId)
      const msg = formatApiError(row.error, 'Video render failed')
      useStudioStore.getState().setWorkspaceError(useStudioStore.getState().activeWorkspaceSlotIndex, msg)
      clearRenderBusyState()
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

  const precheck = validateRenderPayload(payload)
  if (!precheck.ok) {
    log('render_precheck_failed', { reason: precheck.reason, episodeNumber })
    const st = useStudioStore.getState()
    st.setWorkspaceError(st.activeWorkspaceSlotIndex, precheck.reason)
    clearRenderBusyState()
    return null
  }
  log('render_precheck_ok', { imageCount: precheck.imageCount, episodeNumber })

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

  let queueAttempt = 0
  let lastQueueError = 'Video render queue failed'

  while (queueAttempt <= RENDER_MAX_QUEUE_RETRIES) {
    try {
      const { jobId } = await queueBackgroundRender(project.id, episodeNumber, payload)
      logCheckpoint(jobId, 'queued', { queueAttempt, imageCount: payload.images.length })

      patchActiveProject((p) => withRenderStarted({ ...p, renderJobId: jobId }))

      schedulePoll(jobId, episodeNumber, 0, queueAttempt)
      return jobId
    } catch (e) {
      lastQueueError = serializePipelineError(e, 'Video render queue failed')
      log('render_queue_error', { message: lastQueueError, queueAttempt })
      queueAttempt += 1
      if (queueAttempt > RENDER_MAX_QUEUE_RETRIES || !isRetryableRenderError(lastQueueError)) break
      await new Promise((r) => setTimeout(r, 1200 * queueAttempt))
    }
  }

  st.setWorkspaceError(ix, lastQueueError)
  clearRenderBusyState()
  return null
}

/** Resume polling when a project was saved mid-render (e.g. refresh). */
export function resumeEpisodeVideoRenderIfNeeded(project: ProjectState | null | undefined) {
  if (!project?.renderJobId || project.lastRenderVideoUrl) return
  const ep = project.episodes[0]?.number ?? 1
  log('resume_poll', { jobId: project.renderJobId })
  schedulePoll(project.renderJobId, ep)
}
