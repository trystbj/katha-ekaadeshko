/**
 * Text guidance from user-uploaded character reference images (studio project).
 */

export function characterReferencePromptBlock(characterReference, characters = []) {
  const cref = characterReference && typeof characterReference === 'object' ? characterReference : null
  const projectImages = Array.isArray(cref?.images) ? cref.images : []
  const strength = String(cref?.strength || 'balanced').trim()
  const lock = cref?.lockAllEpisodes !== false
  const lines = []

  if (projectImages.length) {
    projectImages.slice(0, 3).forEach((img, i) => {
      const role = String(img?.role || 'reference').trim()
      const note = String(img?.note || '').trim().slice(0, 120)
      lines.push(
        `Project ref ${i + 1} (${role})${note ? `: ${note}` : ''} — preserve exact face, hair, skin tone, costume, accessories.`
      )
    })
  }

  const cast = Array.isArray(characters) ? characters : []
  for (const ch of cast) {
    const refs = Array.isArray(ch?.referenceImages) ? ch.referenceImages : []
    if (!refs.length) continue
    const name = String(ch?.name || 'Character').trim()
    const look = String(ch?.appearance || ch?.visualIdentity || ch?.baseImagePrompt || '').trim().slice(0, 200)
    const roles = refs
      .slice(0, 3)
      .map((img, i) => String(img?.role || `angle${i + 1}`))
      .join(', ')
    lines.push(
      `${name} (${String(ch?.gender || 'cast').trim()}, ${String(ch?.age || 'adult').trim()}): uploaded refs [${roles}]${look ? ` — ${look}` : ''}. Same face every scene.`
    )
  }

  if (!lines.length) return ''

  return [
    'UPLOADED CHARACTER REFERENCE (non-negotiable likeness):',
    ...lines,
    `Reference strength: ${strength}.`,
    lock
      ? 'Lock this cast identity across every scene in the series.'
      : 'Prefer these references when the character appears in frame.',
    'Do NOT invent a new face when a referenced character is visible.'
  ].join(' ')
}
