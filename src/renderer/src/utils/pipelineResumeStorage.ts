import type { JobsStreamGenerateResult } from '../types/kathaGenerate'

const KEY_PREFIX = 'katha_pipeline_resume_'

export type PipelineResumePayload = {
  projectId: string
  savedAt: string
  story: JobsStreamGenerateResult['story']
  masterStoryContext?: Record<string, unknown>
  request: Record<string, unknown>
}

export function savePipelineResume(payload: PipelineResumePayload): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(`${KEY_PREFIX}${payload.projectId}`, JSON.stringify(payload))
  } catch {
    // quota or private mode
  }
}

export function loadPipelineResume(projectId: string): PipelineResumePayload | null {
  if (typeof sessionStorage === 'undefined' || !projectId) return null
  try {
    const raw = sessionStorage.getItem(`${KEY_PREFIX}${projectId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PipelineResumePayload
    if (!parsed?.story?.title || parsed.projectId !== projectId) return null
    return parsed
  } catch {
    return null
  }
}

export function clearPipelineResume(projectId: string): void {
  if (typeof sessionStorage === 'undefined' || !projectId) return
  try {
    sessionStorage.removeItem(`${KEY_PREFIX}${projectId}`)
  } catch {
    // ignore
  }
}
