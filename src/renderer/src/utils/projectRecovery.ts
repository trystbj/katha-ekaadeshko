import type { ProjectState } from '../types/story'
import { defaultProject } from '../types/story'

/**
 * Repair loaded project JSON — prevents blank UI from partial/corrupt cloud payloads.
 * Does not mutate cinematic plans; only ensures required top-level arrays exist.
 */
export function repairProjectOnLoad(raw: ProjectState | null | undefined): ProjectState | null {
  if (!raw || typeof raw !== 'object') return null
  const id = typeof raw.id === 'string' && raw.id.length > 0 ? raw.id : defaultProject().id
  return {
    ...defaultProject(),
    ...raw,
    id,
    episodes: Array.isArray(raw.episodes) ? raw.episodes : [],
    assets: Array.isArray(raw.assets) ? raw.assets : [],
    contentFingerprints: Array.isArray(raw.contentFingerprints) ? raw.contentFingerprints : [],
    updatedAt: raw.updatedAt || new Date().toISOString()
  }
}
