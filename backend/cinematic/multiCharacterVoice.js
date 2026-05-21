/**
 * Multi-character voice casting — maps cast to OpenAI TTS voices (provider-agnostic slots).
 */

const OPENAI_VOICE_BY_GENDER = {
  female: 'nova',
  male: 'onyx',
  child: 'shimmer',
  elder: 'fable',
  neutral: 'alloy'
}

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
    if (/\b(she|her|queen|princess|woman|girl|wife|mother)\b/.test(traits)) suggestedGender = 'female'
    else if (/\b(he|his|king|prince|man|boy|husband|father)\b/.test(traits)) suggestedGender = 'male'
    else if (/\b(child|kid|young)\b/.test(traits)) suggestedGender = 'child'
    else if (/\b(elder|old|grand|ancient)\b/.test(traits)) suggestedGender = 'elder'

    cast.push({
      characterName: name,
      suggestedGender,
      language: lang,
      openAiVoice: OPENAI_VOICE_BY_GENDER[suggestedGender] || 'alloy',
      personalityVoice: String(c.role || c.traits || 'supporting').trim().slice(0, 120),
      providerSlot: `character:${name.slice(0, 32).replace(/\s+/g, '_')}`,
      deliveryHints:
        suggestedGender === 'child'
          ? 'youthful innocence, shorter phrases, playful rhythm'
          : suggestedGender === 'elder'
            ? 'measured wisdom, soft authority'
            : 'natural conversational emotional acting'
    })
  }

  return cast.slice(0, 12)
}

/**
 * @param {string} characterName
 * @param {ReturnType<typeof buildCharacterVoiceCast>} cast
 */
export function voiceForCharacter(characterName, cast = []) {
  const who = String(characterName || '').trim().toLowerCase()
  const hit = cast.find((c) => c.characterName.toLowerCase() === who)
  return hit?.openAiVoice || null
}

/**
 * Whether multi-voice acting is enabled for this run.
 * @param {object} [input]
 */
export function multiVoiceEnabled(input) {
  if (input?.multiCharacterVoices === false) return false
  if (process.env.KATHA_MULTI_VOICE === '0') return false
  return input?.multiCharacterVoices === true || process.env.KATHA_MULTI_VOICE === '1'
}
