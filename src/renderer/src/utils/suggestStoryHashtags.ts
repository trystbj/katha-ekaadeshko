/** Lightweight hashtag helper for publish drafts — Latin slug tokens only. */

const EXTRA = ['storytime', 'fyp', 'katha', 'ai', 'animation', 'shorts', 'nepali', 'folk']

export function suggestHashtags(title: string, genreHint: string, max = 12): string {
  const raw = `${title} ${genreHint}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter(Boolean)
  const seen = new Set<string>()
  const out: string[] = []
  for (const w of raw) {
    if (w.startsWith('#')) continue
    if (w.length < 3 || w.length > 28) continue
    if (seen.has(w)) continue
    seen.add(w)
    out.push(`#${w}`)
    if (out.length >= max) break
  }
  for (const x of EXTRA) {
    if (out.length >= max) break
    const tag = `#${x}`
    if (!seen.has(x)) {
      seen.add(x)
      out.push(tag)
    }
  }
  return out.slice(0, max).join(' ')
}
