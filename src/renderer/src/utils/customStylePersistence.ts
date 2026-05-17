import {
  composeCustomVisualPrompt,
  pruneRecentCustomStyles,
  RECENT_CUSTOM_STYLE_LIMIT,
  type RecentCustomStyleEntry
} from './customStyleCompose'

const STORAGE_KEY = 'katha-studio-custom-styles-v2'

export type PersistedCustomStyles = {
  recent: RecentCustomStyleEntry[]
  description: string
}

const DEFAULT: PersistedCustomStyles = {
  recent: [],
  description: ''
}

function normalizeRecentEntries(raw: unknown, now = Date.now()): RecentCustomStyleEntry[] {
  if (!Array.isArray(raw)) return []
  const entries: RecentCustomStyleEntry[] = []
  for (const item of raw) {
    if (typeof item === 'string') {
      const text = item.trim()
      if (text) entries.push({ text, savedAt: now })
      continue
    }
    if (item && typeof item === 'object') {
      const o = item as { text?: unknown; savedAt?: unknown }
      const text = typeof o.text === 'string' ? o.text.trim() : ''
      const savedAt = typeof o.savedAt === 'number' && Number.isFinite(o.savedAt) ? o.savedAt : now
      if (text) entries.push({ text, savedAt })
    }
  }
  const seen = new Set<string>()
  const deduped: RecentCustomStyleEntry[] = []
  for (const entry of entries) {
    if (seen.has(entry.text)) continue
    seen.add(entry.text)
    deduped.push(entry)
  }
  return pruneRecentCustomStyles(deduped, now)
}

function mergeLegacyDraftParts(o: {
  description?: unknown
  mood?: unknown
  intensity?: unknown
  environment?: unknown
}): string {
  const base = typeof o.description === 'string' ? o.description.trim() : ''
  const tags: string[] = []
  const mood = typeof o.mood === 'string' ? o.mood.trim() : ''
  const intensity = typeof o.intensity === 'string' ? o.intensity.trim() : ''
  const env = typeof o.environment === 'string' ? o.environment.trim() : ''
  if (mood) tags.push(`mood: ${mood}`)
  if (intensity) tags.push(`cinematic intensity: ${intensity}`)
  if (env) tags.push(`environment: ${env}`)
  if (!base && tags.length === 0) return ''
  if (tags.length === 0) return base
  return `${base}. ${tags.join('; ')}`.trim()
}

function migrateFromV1(now = Date.now()): PersistedCustomStyles | null {
  try {
    const raw = localStorage.getItem('katha-studio-custom-styles-v1')
    if (!raw) return null
    const o = JSON.parse(raw) as { saved?: string[]; recent?: string[]; draft?: string }
    const recent = normalizeRecentEntries(
      [...(Array.isArray(o.recent) ? o.recent : []), ...(Array.isArray(o.saved) ? o.saved : [])],
      now
    )
    return {
      recent,
      description: typeof o.draft === 'string' ? o.draft : ''
    }
  } catch {
    return null
  }
}

export function loadPersistedCustomStyles(): PersistedCustomStyles {
  const now = Date.now()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const migrated = migrateFromV1(now)
      return migrated ?? { ...DEFAULT }
    }
    const o = JSON.parse(raw) as Partial<PersistedCustomStyles> & {
      mood?: string
      intensity?: string
      environment?: string
    }
    const recent = normalizeRecentEntries(o.recent, now)
    const merged = mergeLegacyDraftParts(o)
    const description = composeCustomVisualPrompt(merged || (typeof o.description === 'string' ? o.description : ''))
    return { recent, description }
  } catch {
    return { ...DEFAULT }
  }
}

export function savePersistedCustomStyles(data: PersistedCustomStyles): boolean {
  try {
    const now = Date.now()
    const recent = pruneRecentCustomStyles(data.recent, now)
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        recent: recent.slice(0, RECENT_CUSTOM_STYLE_LIMIT),
        description: data.description
      })
    )
    return true
  } catch {
    return false
  }
}
