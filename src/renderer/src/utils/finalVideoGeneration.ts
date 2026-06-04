import type { ProjectState } from '../types/story'
import { deriveCinematicProductionGate } from './cinematicProductionGate'
import { queueEpisodeVideoRender } from './episodeVideoRender'
import { useStudioStore } from '../store/useStudioStore'
import { withStoryboardReady } from './storyboardWorkflow'
import {
  auditEpisodePipelineCompletion,
  formatExportBlockers
} from './pipelineCompletionAudit'
import { runExportPipelinePrecheck } from './exportPipelinePrecheck'

export type FinalVideoValidation = {
  ok: boolean
  errors: string[]
  episodeNumber: number
}

export async function validateFinalVideoPrerequisites(
  project: ProjectState | null | undefined,
  episodeNumber?: number
): Promise<FinalVideoValidation> {
  const epn =
    episodeNumber ??
    project?.episodes.find((e) => e.scenes?.length)?.number ??
    project?.episodes[0]?.number ??
    1
  if (!project?.bible) {
    return { ok: false, errors: ['Story is not generated yet.'], episodeNumber: epn }
  }
  const report = await auditEpisodePipelineCompletion(project, epn)
  const errors = formatExportBlockers(report)
  const ep = project.episodes.find((e) => e.number === epn)
  const scenes = ep?.scenes ?? []
  if (scenes.length) {
    const indices = scenes.map((s) => s.index).filter((n) => n > 0)
    const sorted = [...indices].sort((a, b) => a - b)
    const monotonic = sorted.every((n, i) => i === 0 || n > sorted[i - 1])
    if (!monotonic) errors.push('Scene order is invalid — renumber scenes before export.')
    if (sorted[0] !== 1) errors.push('Scene timeline must start at scene 1.')
  }
  return { ok: errors.length === 0 && report.exportReady, errors, episodeNumber: epn }
}

function setVideoJobStage(stage: string, progress: number) {
  const st = useStudioStore.getState()
  const ix = st.activeWorkspaceSlotIndex
  st.setWorkspaceJob(ix, { id: 'final_video', stage, progress, log: [] })
  if (ix === st.activeWorkspaceSlotIndex) {
    st.setJob({ id: 'final_video', stage, progress, log: [] })
  }
}

/**
 * Validate → repair assets → re-validate → queue worker MP4 render.
 */
export async function runFinalVideoGeneration(opts?: {
  project?: ProjectState | null
  episodeNumber?: number
  onBeforeMotion?: (episodeNumber: number) => Promise<void>
  ensureSceneImages?: (episodeNumber: number) => Promise<boolean>
  generateVisuals?: (opts: { episodeNumber: number }) => Promise<void>
}): Promise<string | null> {
  const st = useStudioStore.getState()
  let project = opts?.project ?? st.project
  const ix = st.activeWorkspaceSlotIndex
  const epn =
    opts?.episodeNumber ??
    project?.episodes.find((e) => e.scenes?.length)?.number ??
    project?.episodes[0]?.number ??
    1

  if (!project?.bible) {
    const msg = 'Story is not generated yet.'
    st.setWorkspaceError(ix, msg)
    if (ix === st.activeWorkspaceSlotIndex) st.setError(msg)
    return null
  }

  st.setWorkspaceError(ix, null)
  if (ix === st.activeWorkspaceSlotIndex) st.setError(null)

  if (opts?.ensureSceneImages) {
    setVideoJobStage('Validating assets', 2)
    const precheck = await runExportPipelinePrecheck({
      project,
      episodeNumber: epn,
      ensureSceneImages: opts.ensureSceneImages,
      generateVisuals: opts.generateVisuals,
      onStage: (stage) => setVideoJobStage(stage, 6)
    })
    project = useStudioStore.getState().workspaceSlots[ix]?.project ?? project
    if (!precheck.ok) {
      const msg = precheck.errors.join(' ') || 'Export blocked — assets incomplete.'
      st.setWorkspaceError(ix, msg)
      if (ix === st.activeWorkspaceSlotIndex) st.setError(msg)
      console.warn('[katha:render]', 'final_video_precheck_failed', {
        errors: precheck.errors,
        repaired: precheck.repaired
      })
      return null
    }
  } else {
    const validation = await validateFinalVideoPrerequisites(project, epn)
    if (!validation.ok) {
      const msg = validation.errors.join(' ')
      st.setWorkspaceError(ix, msg)
      if (ix === st.activeWorkspaceSlotIndex) st.setError(msg)
      return null
    }
  }

  const gate = deriveCinematicProductionGate(project, epn)
  if (!gate.narrationGenerated || !gate.sceneImagesGenerated) {
    const report = await auditEpisodePipelineCompletion(project!, epn)
    const msg = formatExportBlockers(report).join(' ') || 'Assets incomplete.'
    st.setWorkspaceError(ix, msg)
    if (ix === st.activeWorkspaceSlotIndex) st.setError(msg)
    return null
  }

  setVideoJobStage('Preparing Assets', 10)
  console.info('[katha:render]', 'final_video_start', { projectId: project?.id, episodeNumber: epn })

  st.patchWorkspaceProject(ix, (p) => {
    if (!p.bible) return p
    const withReady = withStoryboardReady(p, { partial: false, episodeNumber: epn })
    return { ...withReady, workflowPhase: 'rendering' }
  })

  if (opts?.onBeforeMotion) {
    setVideoJobStage('Generating Video', 14)
    await opts.onBeforeMotion(epn)
  }

  setVideoJobStage('Building Timeline', 18)
  const latest = useStudioStore.getState().workspaceSlots[ix]?.project ?? project
  if (!latest) return null

  const jobId = await queueEpisodeVideoRender({
    project: latest,
    episodeNumber: epn,
    force: true
  })

  if (!jobId) {
    const err = useStudioStore.getState().workspaceRuntime[ix]?.error || 'Video render could not start.'
    console.warn('[katha:render]', 'final_video_queue_failed', { err })
    return null
  }

  setVideoJobStage('Rendering Scenes', 22)
  return jobId
}
