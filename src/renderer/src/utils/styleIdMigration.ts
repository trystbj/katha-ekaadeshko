import { DEFAULT_STYLE_ID } from '../constants/studioDefaults'
import type { VisualStyleId } from '../types/story'

/** Legacy Sketch slot stored as romantic_glow — map to Cartoon (cozy storybook). */
const LEGACY_STYLE_MAP: Record<string, VisualStyleId> = {
  romantic_glow: 'cozy_storybook',
  sketch: 'cozy_storybook',
  dark_anime: 'cinematic_realistic'
}

export function migrateVisualStyleId(raw: unknown): VisualStyleId | '' {
  if (raw === '' || raw == null) return ''
  const id = String(raw)
  if (id in LEGACY_STYLE_MAP) return LEGACY_STYLE_MAP[id]
  const allowed: VisualStyleId[] = [
    'soft_anime_fantasy',
    'cozy_storybook',
    'cinematic_anime',
    'cinematic_realistic',
    'comic_panel',
    'custom'
  ]
  return allowed.includes(id as VisualStyleId) ? (id as VisualStyleId) : ''
}

export function migrateProjectBibleStyleId(raw: unknown): VisualStyleId | undefined {
  const next = migrateVisualStyleId(raw)
  return next === '' ? undefined : next
}

/** Always returns a valid preset id (never legacy / unknown). */
export function resolveVisualStyleId(raw: unknown): VisualStyleId {
  const migrated = migrateVisualStyleId(raw)
  return migrated === '' ? DEFAULT_STYLE_ID : migrated
}
