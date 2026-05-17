/**
 * Future-ready multi-character voice casting (provider-agnostic slots).
 */

/**
 * @param {object} [story]
 * @param {object} [input]
 */
export function buildCharacterVoiceCast(story, input) {
  const lang = String(input?.storyLanguage || 'en').split(/[-_]/)[0]
  const chars = Array.isArray(story?.characters) ? story.characters : []
  const cast = []

  for (const c of chars) {
    const name = String(c?.name || '').trim()
    if (!name || /^narrat/i.test(name)) continue
    const traits = `${c.role || ''} ${c.traits || ''}`.toLowerCase()
    let suggestedGender = 'neutral'
    if (/\b(she|her|queen|princess|woman|girl)\b/.test(traits)) suggestedGender = 'female'
    else if (/\b(he|his|king|prince|man|boy)\b/.test(traits)) suggestedGender = 'male'
    else if (/\b(child|kid)\b/.test(traits)) suggestedGender = 'child'

    cast.push({
      characterName: name,
      suggestedGender,
      language: lang,
      personalityVoice: String(c.role || c.traits || 'supporting').trim().slice(0, 120),
      providerSlot: `character:${name.slice(0, 32).replace(/\s+/g, '_')}`
    })
  }

  return cast.slice(0, 12)
}
