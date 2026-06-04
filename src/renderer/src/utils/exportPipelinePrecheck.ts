import type { ProjectState } from '../types/story'
import {
  applyPipelineValidationToProject,
  auditEpisodePipelineCompletion,
  formatExportBlockers,
  type PipelineValidationReport
} from './pipelineCompletionAudit'
import { useStudioStore } from '../store/useStudioStore'

export type ExportPrecheckResult = {
  ok: boolean
  report: PipelineValidationReport
  errors: string[]
  repaired: boolean
}

/**
 * Validate → repair scene images / visuals (TTS) → re-validate before final MP4.
 */
export async function runExportPipelinePrecheck(opts: {
  project: ProjectState
  episodeNumber: number
  ensureSceneImages: (episodeNumber: number) => Promise<boolean>
  generateVisuals?: (opts: { episodeNumber: number }) => Promise<void>
  onStage?: (stage: string) => void
}): Promise<ExportPrecheckResult> {
  const ix = useStudioStore.getState().activeWorkspaceSlotIndex
  let project = opts.project
  const epn = opts.episodeNumber
  let repaired = false

  const patch = (next: ProjectState) => {
    project = next
    useStudioStore.getState().patchWorkspaceProject(ix, () => next)
  }

  opts.onStage?.('Validating pipeline')
  let report = await auditEpisodePipelineCompletion(project, epn)
  patch(applyPipelineValidationToProject(project, report))

  const imageProblems = report.scenes.some(
    (s) => s.image !== 'ok' || s.preview !== 'ok'
  )

  if (imageProblems) {
    opts.onStage?.('Repairing scene images')
    repaired = true
    await opts.ensureSceneImages(epn)
    project = useStudioStore.getState().workspaceSlots[ix]?.project ?? project
    report = await auditEpisodePipelineCompletion(project, epn)
    patch(applyPipelineValidationToProject(project, report))
  }

  if (report.narrationState !== 'audio_ready' && opts.generateVisuals) {
    opts.onStage?.('Generating narration audio')
    repaired = true
    await opts.generateVisuals({ episodeNumber: epn })
    project = useStudioStore.getState().workspaceSlots[ix]?.project ?? project
    report = await auditEpisodePipelineCompletion(project, epn)
    patch(applyPipelineValidationToProject(project, report))
  }

  if (
    !report.animationReady &&
    report.scenes.some((s) => s.image !== 'ok' || s.preview !== 'ok')
  ) {
    opts.onStage?.('Regenerating failed scene images')
    repaired = true
    await opts.ensureSceneImages(epn)
    project = useStudioStore.getState().workspaceSlots[ix]?.project ?? project
    report = await auditEpisodePipelineCompletion(project, epn)
    patch(applyPipelineValidationToProject(project, report))
  }

  opts.onStage?.('Final validation')
  const errors = formatExportBlockers(report)
  return {
    ok: report.animationReady && errors.length === 0,
    report,
    errors,
    repaired
  }
}
