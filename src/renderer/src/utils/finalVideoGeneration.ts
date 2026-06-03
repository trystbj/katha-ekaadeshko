import type { ProjectState } from '../types/story'
import { deriveCinematicProductionGate } from './cinematicProductionGate'
import { queueEpisodeVideoRender } from './episodeVideoRender'
import { useStudioStore } from '../store/useStudioStore'
import { withStoryboardReady } from './storyboardWorkflow'

export type FinalVideoValidation = {
  ok: boolean
  errors: string[]
  episodeNumber: number
}

export function validateFinalVideoPrerequisites(
  project: ProjectState | null | undefined,
  episodeNumber?: number
): FinalVideoValidation {
  const epn =
    episodeNumber ??
    project?.episodes.find((e) => e.scenes?.length)?.number ??
    project?.episodes[0]?.number ??
    1
  const errors: string[] = []
  if (!project?.bible) errors.push('Story is not generated yet.')
  const gate = deriveCinematicProductionGate(project, epn)
  if (!gate.storyGenerated) errors.push('Episode scenes are missing.')
  if (!gate.sceneImagesGenerated) {
    errors.push(`Scene images incomplete (${gate.coverage.withImage}/${gate.coverage.total}).`)
  }
  if (!gate.narrationGenerated) errors.push('Narration audio is missing — generate visuals first.')
  return { ok: errors.length === 0, errors, episodeNumber: epn }
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
 * Validate, prepare project state, and queue worker MP4 render with progress stages.
 */
export async function runFinalVideoGeneration(opts?: {
  project?: ProjectState | null
  episodeNumber?: number
  onBeforeMotion?: (episodeNumber: number) => Promise<void>
}): Promise<string | null> {
  const st = useStudioStore.getState()
  const project = opts?.project ?? st.project
  const validation = validateFinalVideoPrerequisites(project, opts?.episodeNumber)
  const ix = st.activeWorkspaceSlotIndex

  if (!validation.ok) {
    const msg = validation.errors.join(' ')
    st.setWorkspaceError(ix, msg)
    if (ix === st.activeWorkspaceSlotIndex) st.setError(msg)
    console.warn('[katha:render]', 'final_video_blocked', { errors: validation.errors })
    return null
  }

  const epn = validation.episodeNumber
  st.setWorkspaceError(ix, null)
  if (ix === st.activeWorkspaceSlotIndex) st.setError(null)

  setVideoJobStage('Preparing Assets', 2)
  console.info('[katha:render]', 'final_video_start', { projectId: project?.id, episodeNumber: epn })

  st.patchWorkspaceProject(ix, (p) => {
    if (!p.bible) return p
    const withReady = withStoryboardReady(p, { partial: false, episodeNumber: epn })
    return { ...withReady, workflowPhase: 'rendering' }
  })

  if (opts?.onBeforeMotion) {
    setVideoJobStage('Generating Video', 8)
    await opts.onBeforeMotion(epn)
  }

  setVideoJobStage('Building Timeline', 12)
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

  setVideoJobStage('Rendering Scenes', 20)
  return jobId
}
