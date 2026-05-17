import type { EpisodePacing, ProjectState, StoryEpisode } from '../types/story'

export type StudioSearchResult =
  | { kind: 'episode'; episodeNumber: number; pacing: EpisodePacing; snippet: string }
  | { kind: 'bible'; bibleTitle: string | null; snippet: string }
  | { kind: 'history'; projectId: string; title: string; snippet: string }
  | { kind: 'cloud'; projectId: string; title: string; snippet: string }

function snippetAround(haystack: string, needle: string, maxTotal = 96): string {
  const h = haystack
  if (!h.trim()) return ''
  const lower = h.toLowerCase()
  const n = needle.toLowerCase()
  const i = lower.indexOf(n)
  if (i < 0) {
    const t = h.replace(/\s+/g, ' ').trim()
    return t.length <= maxTotal ? t : `${t.slice(0, maxTotal)}…`
  }
  const pad = 36
  const start = Math.max(0, i - pad)
  const end = Math.min(h.length, i + needle.length + pad)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < h.length ? '…' : ''
  return `${prefix}${h.slice(start, end)}${suffix}`
}

function episodeHaystack(ep: StoryEpisode): string {
  const parts = [
    String(ep.number),
    ep.pacing,
    ep.cliffhanger,
    ep.rawStructured,
    ...(ep.scenes ?? []).flatMap((s) => [s.character, s.text, s.visualDescription ?? ''])
  ]
  return parts.filter(Boolean).join('\n')
}

export function buildStudioMonitorSearchResults(
  needleRaw: string,
  project: ProjectState | null,
  historyRows: { id: string; title: string }[],
  cloudRows: { id: string; title: string }[]
): StudioSearchResult[] {
  const needle = needleRaw.trim().toLowerCase()
  if (needle.length < 1) return []

  const out: StudioSearchResult[] = []

  if (project?.bible) {
    const b = project.bible
    const bibleHay = [b.title, b.concept, ...b.characters.map((c) => `${c.name} ${c.personality}`)].join('\n')
    if (bibleHay.toLowerCase().includes(needle)) {
      const bt = b.title?.trim()
      out.push({
        kind: 'bible',
        bibleTitle: bt ? bt : null,
        snippet: snippetAround(bibleHay, needle)
      })
    }
  }

  if (project?.episodes?.length) {
    for (const ep of project.episodes) {
      const hay = episodeHaystack(ep)
      if (hay.toLowerCase().includes(needle)) {
        out.push({
          kind: 'episode',
          episodeNumber: ep.number,
          pacing: ep.pacing,
          snippet: snippetAround(hay, needle)
        })
      }
    }
  }

  const seenHistory = new Set<string>()
  for (const row of historyRows) {
    if (project?.id && row.id === project.id) continue
    const title = row.title || ''
    if (title.toLowerCase().includes(needle)) {
      if (seenHistory.has(row.id)) continue
      seenHistory.add(row.id)
      out.push({
        kind: 'history',
        projectId: row.id,
        title,
        snippet: snippetAround(title, needle)
      })
    }
  }

  const seenCloud = new Set<string>()
  for (const row of cloudRows) {
    if (project?.id && row.id === project.id) continue
    const title = row.title || ''
    if (title.toLowerCase().includes(needle)) {
      if (seenCloud.has(row.id)) continue
      seenCloud.add(row.id)
      out.push({
        kind: 'cloud',
        projectId: row.id,
        title,
        snippet: snippetAround(title, needle)
      })
    }
  }

  return out
}
