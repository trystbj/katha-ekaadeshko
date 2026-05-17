import type { SubtitleStudioState } from '../types/subtitleStudio'
import { normalizeSubtitleStudio } from '../types/subtitleStudio'

const LS_KEY = 'katha-subtitle-studio-presets-v1'

export type StoredSubtitleStudioPreset = {
  id: string
  name: string
  savedAt: string
  studio: SubtitleStudioState
}

export function loadStoredSubtitlePresets(): StoredSubtitleStudioPreset[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredSubtitleStudioPreset[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((p) => ({
      ...p,
      studio: normalizeSubtitleStudio(p.studio)
    }))
  } catch {
    return []
  }
}

export function persistStoredSubtitlePresets(items: StoredSubtitleStudioPreset[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items))
  } catch {
    /* ignore quota */
  }
}
