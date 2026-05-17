export type GuideBlock =
  | { type: 'p'; text: string }
  | { type: 'h4'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }

export type GuideSection = {
  id: string
  title: string
  blocks: GuideBlock[]
}

export function guideSectionSearchBlob(s: GuideSection): string {
  const parts: string[] = [s.title]
  for (const b of s.blocks) {
    if (b.type === 'ul' || b.type === 'ol') parts.push(...b.items)
    else parts.push(b.text)
  }
  return parts.join(' \n ').toLowerCase()
}
