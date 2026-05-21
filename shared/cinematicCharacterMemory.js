/**
 * Cinematic character memory — appearance, voice, emotion, relationships across scenes/episodes.
 */

function inferGenderFromText(text = '') {
  const t = String(text).toLowerCase()
  if (/\b(woman|female|girl|wife|mother|sister|daughter|queen|lady|bride)\b/.test(t)) return 'female'
  if (/\b(man|male|boy|husband|father|brother|son|king|lord|gentleman|groom)\b/.test(t)) return 'male'
  if (/\b(child|kid|young)\b/.test(t)) return 'child'
  if (/\b(elder|old|ancient|grand)\b/.test(t)) return 'elder'
  return 'unknown'
}

function inferVoiceStyle(gender, traits = '') {
  const t = String(traits).toLowerCase()
  if (/\b(shy|quiet|soft|timid)\b/.test(t)) return 'soft_hesitant'
  if (/\b(angry|fierce|bold|loud)\b/.test(t)) return 'assertive'
  if (/\b(playful|witty|humor)\b/.test(t)) return 'playful'
  if (gender === 'child') return 'youthful'
  if (gender === 'elder') return 'measured_wisdom'
  if (gender === 'female') return 'warm_expressive'
  if (gender === 'male') return 'calm_confident'
  return 'neutral_story'
}

/**
 * @param {Array<{ name?: string; role?: string; traits?: string; visualIdentity?: string; baseImagePrompt?: string }>} characters
 */
export function buildCinematicCharacterMemory(characters = []) {
  return characters.map((c, i) => {
    const label = String(c.name || `Character ${i + 1}`).trim()
    const traits = String(c.traits || c.role || '').trim()
    const visual = String(c.visualIdentity || '').trim()
    const gender = inferGenderFromText(`${c.role} ${traits} ${label}`)
    return {
      slot: i + 1,
      label,
      gender,
      role: String(c.role || '').trim(),
      traits,
      visualIdentity: visual,
      baseImagePrompt: String(c.baseImagePrompt || '').trim(),
      hair: visual.match(/\b(hair|locks|braid|bun)[^.]{0,60}/i)?.[0]?.trim(),
      clothing: visual.match(/\b(dress|sari|coat|shirt|outfit|armor|robe)[^.]{0,60}/i)?.[0]?.trim(),
      accessories: visual.match(/\b(necklace|ring|scarf|hat|glasses|jewelry)[^.]{0,40}/gi)?.join('; ') || '',
      ageGroup: gender === 'child' ? 'child' : gender === 'elder' ? 'elder' : 'adult',
      emotionalState: 'baseline',
      voiceStyle: inferVoiceStyle(gender, traits),
      speakingBehavior: traits.slice(0, 120) || 'natural conversational',
      relationshipHistory: [],
      continuityLocks: [
        visual ? `Appearance lock: ${visual.slice(0, 200)}` : '',
        `Voice style lock: ${inferVoiceStyle(gender, traits)}`,
        `Gender presentation lock: ${gender}`
      ].filter(Boolean)
    }
  })
}

/**
 * Blueprint lines for LLM + Leonardo identity.
 * @param {ReturnType<typeof buildCinematicCharacterMemory>} memory
 */
export function cinematicCharacterMemoryBlueprint(memory = []) {
  if (!memory.length) return ''
  const lines = memory.map(
    (m) =>
      `- ${m.label}: ${m.visualIdentity || m.role} | voice=${m.voiceStyle} | emotion=${m.emotionalState} | NEVER change face/hair/outfit/gender without story-motivated beat.`
  )
  return ['CINEMATIC CHARACTER MEMORY (continuity — mandatory):', ...lines].join('\n')
}
