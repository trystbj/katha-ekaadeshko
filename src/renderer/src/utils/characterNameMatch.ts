/** Loose match between bible character full name and scene script speaker label. */
export function namesMatch(bibleName: string, sceneSpeaker: string): boolean {
  const label = sceneSpeaker.trim().toLowerCase()
  const full = bibleName.trim().toLowerCase()
  if (!label) return false
  const labelFirst = label.split(/\s+/)[0] ?? ''
  const fullFirst = full.split(/\s+/)[0] ?? ''
  if (full.includes(label) || label.includes(fullFirst)) return true
  if (labelFirst && fullFirst && labelFirst === fullFirst) return true
  return false
}
