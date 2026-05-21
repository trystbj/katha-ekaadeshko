/**
 * Merge studio bible cast (reference images, appearance) into pipeline story characters.
 */

export function mergeBibleCharactersIntoCast(storyCharacters, bibleCharacters) {
  const story = Array.isArray(storyCharacters) ? storyCharacters : []
  const bible = Array.isArray(bibleCharacters) ? bibleCharacters : []
  if (!bible.length) return story

  const byName = new Map(
    bible
      .filter((b) => b && typeof b === 'object')
      .map((b) => [String(b.name || '').trim().toLowerCase(), b])
  )

  return story.map((c, i) => {
    const key = String(c?.name || '').trim().toLowerCase()
    const hit = byName.get(key) || bible[i]
    if (!hit || typeof hit !== 'object') return c
    return {
      ...c,
      ...(hit.gender ? { gender: hit.gender } : {}),
      ...(hit.age ? { age: hit.age } : {}),
      ...(hit.appearance || hit.visualIdentity
        ? { appearance: String(hit.appearance || hit.visualIdentity).trim() }
        : {}),
      ...(Array.isArray(hit.referenceImages) && hit.referenceImages.length
        ? { referenceImages: hit.referenceImages }
        : {})
    }
  })
}
