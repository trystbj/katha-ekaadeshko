/** Max recent custom styles kept locally (auto-pruned). */
export const RECENT_CUSTOM_STYLE_LIMIT = 8

/** Drop recent entries older than this (30 days). */
export const RECENT_CUSTOM_STYLE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

export type RecentCustomStyleEntry = {
  text: string
  savedAt: number
}

export function pruneRecentCustomStyles(
  entries: RecentCustomStyleEntry[],
  now = Date.now()
): RecentCustomStyleEntry[] {
  const cutoff = now - RECENT_CUSTOM_STYLE_RETENTION_MS
  return entries.filter((e) => e.savedAt >= cutoff).slice(0, RECENT_CUSTOM_STYLE_LIMIT)
}

export function upsertRecentCustomStyle(
  entries: RecentCustomStyleEntry[],
  text: string,
  now = Date.now()
): RecentCustomStyleEntry[] {
  const trimmed = text.trim()
  if (!trimmed) return pruneRecentCustomStyles(entries, now)
  const pruned = pruneRecentCustomStyles(entries, now)
  const next = [{ text: trimmed, savedAt: now }, ...pruned.filter((e) => e.text !== trimmed)]
  return next.slice(0, RECENT_CUSTOM_STYLE_LIMIT)
}



export const CUSTOM_STYLE_PLACEHOLDER_EXAMPLES = [

  'customStylePlaceholderEx1',

  'customStylePlaceholderEx2',

  'customStylePlaceholderEx3',

  'customStylePlaceholderEx4',

  'customStylePlaceholderEx5'

] as const



const MOOD_RE = /\.\s*mood:\s*([^;]+)/i

const INTENSITY_RE = /;\s*cinematic intensity:\s*([^;]+)/i

const ENV_RE = /;\s*environment:\s*([^;]+)/i



/** Strip legacy tag suffixes from older saved custom prompts. */

export function parseCustomVisualPrompt(line: string): string {

  const raw = line.trim()

  if (!raw) return ''

  const moodM = raw.match(MOOD_RE)

  const intM = raw.match(INTENSITY_RE)

  const envM = raw.match(ENV_RE)

  if (!moodM && !intM && !envM) return raw

  let description = raw

  if (moodM?.index != null) description = description.slice(0, moodM.index).trim()

  else if (intM?.index != null) description = description.slice(0, intM.index).trim()

  else if (envM?.index != null) description = description.slice(0, envM.index).trim()

  return description.replace(/\.\s*$/, '').trim()

}



export function composeCustomVisualPrompt(description: string): string {

  return description.trim().slice(0, 720)

}



/** Infer panel ambience from free-text description (no separate mood fields). */

export function inferCustomStyleMoodPreview(description: string): 'cozy' | 'dark' | 'dream' | 'neutral' {

  const m = description.trim().toLowerCase()

  if (m.includes('dark') || m.includes('horror') || m.includes('noir')) return 'dark'

  if (m.includes('cozy') || m.includes('warm') || m.includes('storybook')) return 'cozy'

  if (m.includes('dream') || m.includes('soft') || m.includes('fantasy')) return 'dream'

  return 'neutral'

}


