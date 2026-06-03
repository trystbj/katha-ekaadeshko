import type { ProjectState } from '../types/story'
import { buildVisualPipelinePayload } from './buildVisualPipelinePayload'

export type VisualPreflightResult = { ok: boolean; errors: string[] }

export function validateVisualGenerationPreflight(
  project: ProjectState | null | undefined,
  episodeNumber: number
): VisualPreflightResult {
  const errors: string[] = []
  if (!project?.bible) errors.push('story_missing')
  if (!project?.bible?.styleId && !project?.bible?.customVisualPrompt) errors.push('style_missing')
  if (!project?.bible?.characters?.length) errors.push('characters_missing')
  const payload = project ? buildVisualPipelinePayload(project, episodeNumber) : null
  if (!payload?.script?.length) errors.push('script_missing')
  if (payload && !payload.story) errors.push('story_payload_missing')
  const cast = project?.bible?.characters ?? []
  for (const c of cast) {
    if (!String(c.name || '').trim()) errors.push('character_name_missing')
    if (!String(c.visualIdentity || c.appearance || '').trim()) errors.push(`character_visual:${c.name}`)
  }
  return { ok: errors.length === 0, errors }
}
