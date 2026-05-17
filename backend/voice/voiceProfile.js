/**
 * AI voice profile generation — language, gender, age, emotion, style (provider-agnostic).
 */

/** @typedef {import('../../core/voice/types.ts').VoiceProfile} VoiceProfile */

function norm(s) {
  return String(s ?? '')
    .toLowerCase()
    .trim()
}

function baseLang(code) {
  return norm(code).split(/[-_]/)[0] || 'en'
}

/**
 * Infer gender role from narrator id, preference, names, and story blob.
 * @param {Record<string, unknown>} ctx
 */
export function inferVoiceGender(ctx) {
  const pref = norm(ctx.narratorGenderPreference)
  if (pref && pref !== 'auto') {
    if (['male', 'female', 'child', 'elder', 'mythical', 'dark_entity', 'anime_hero', 'anime_villain'].includes(pref)) {
      return pref
    }
  }

  const narratorId = norm(ctx.narratorId)
  if (narratorId === 'penguin') return 'female'
  if (narratorId === 'tryst_bj') return 'male'

  const blob = [
    ctx.narration,
    ctx.seedLine,
    ctx.narratorName,
    ...(Array.isArray(ctx.characters) ? ctx.characters.map((c) => `${c?.name} ${c?.personality}`) : [])
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase()

  if (/\b(demon|entity|void|eldritch|abomination|dark\s+lord)\b/.test(blob)) return 'dark_entity'
  if (/\b(hero|champion|protagonist|savior)\b/.test(blob) && /anime|shonen|manga/.test(blob + norm(ctx.styleId))) {
    return 'anime_hero'
  }
  if (/\b(villain|antagonist|tyrant|overlord)\b/.test(blob) && /anime|shonen|manga/.test(blob + norm(ctx.styleId))) {
    return 'anime_villain'
  }
  if (/\b(goddess|spirit|oracle|fairy|deity|celestial)\b/.test(blob)) return 'mythical'
  if (/\b(grandmother|grandfather|grandma|grandpa|elder|sage|ancient)\b/.test(blob)) return 'elder'
  if (/\b(child|kid\b|young\s+boy|young\s+girl|toddler)\b/.test(blob)) return 'child'
  if (/\b(she\b|her\b|herself|woman|girl\b|queen|princess|mother)\b/.test(blob) && !/\b(he\b|his\b|him\b|man\b|king|prince|father)\b/.test(blob)) {
    return 'female'
  }
  if (/\b(he\b|his\b|him\b|man\b|king|prince|father|brother)\b/.test(blob)) return 'male'

  return 'neutral'
}

/**
 * @param {string} styleId
 * @param {string} [customVisualPrompt]
 */
export function cinematicStyleKey(styleId, customVisualPrompt) {
  const sid = norm(styleId) || 'soft_anime_fantasy'
  if (sid === 'custom') return `custom:${norm(customVisualPrompt).slice(0, 80)}`
  return sid
}

/**
 * @param {Record<string, unknown>} ctx
 * @returns {VoiceProfile}
 */
export function buildVoiceProfile(ctx) {
  const language = baseLang(ctx.storyLanguage || ctx.languageId || 'en')
  const genre = norm(ctx.genre)
  const storyTone = norm(ctx.storyTone)
  const styleId = norm(ctx.styleId) || 'soft_anime_fantasy'
  const blob = `${norm(ctx.narration)}\n${norm(ctx.seedLine)}\n${genre}\n${storyTone}`

  let emotionStyle = 'neutral'
  let pacingStyle = 'moderate'
  let intensityLevel = 'medium'

  if (storyTone === 'warm' || storyTone === 'tender') emotionStyle = 'tender'
  else if (storyTone === 'tense') emotionStyle = 'suspense'
  else if (storyTone === 'epic') emotionStyle = 'epic'
  else if (storyTone === 'whimsical') emotionStyle = 'comedy'
  else if (storyTone === 'noir') emotionStyle = 'noir'

  if (/horror|terror|ghost/.test(genre) || /\b(terror|nightmare|blood|scream)\b/.test(blob)) {
    emotionStyle = 'horror'
    pacingStyle = 'suspense'
    intensityLevel = 'high'
  } else if (/mystery|thriller|noir|detective/.test(genre)) {
    emotionStyle = 'mystery'
    pacingStyle = 'suspense'
  } else if (/comedy|humou?r/.test(genre)) {
    emotionStyle = 'comedy'
    pacingStyle = 'energetic'
  } else if (/\baction\b|adventure|battle/.test(genre) || /\b(fight|chase|explosion)\b/.test(blob)) {
    emotionStyle = 'action'
    pacingStyle = 'energetic'
    intensityLevel = 'high'
  } else if (/romance|love/.test(genre)) {
    emotionStyle = 'tender'
    pacingStyle = 'calm'
  } else if (/fantasy|myth|folklore/.test(genre)) {
    emotionStyle = 'fantasy'
    pacingStyle = 'dramatic'
  }

  const stylePresetEmotion = stylePresetVoiceEmotion(styleId, norm(ctx.customVisualPrompt))
  if (stylePresetEmotion) emotionStyle = stylePresetEmotion.emotion
  if (stylePresetEmotion?.pacing) pacingStyle = stylePresetEmotion.pacing
  if (stylePresetEmotion?.intensity) intensityLevel = stylePresetEmotion.intensity

  const gender = inferVoiceGender(ctx)
  const ageGroup = inferAgeGroup(gender, blob, styleId)

  return {
    language,
    gender,
    ageGroup,
    emotionStyle,
    cinematicStyle: cinematicStyleKey(styleId, ctx.customVisualPrompt),
    pacingStyle,
    intensityLevel,
    autoDetected: !ctx.narratorGenderPreference || norm(ctx.narratorGenderPreference) === 'auto'
  }
}

function stylePresetVoiceEmotion(styleId, customBlob) {
  switch (styleId) {
    case 'cozy_storybook':
      return { emotion: 'warm', pacing: 'calm', intensity: 'low' }
    case 'soft_anime_fantasy':
      return { emotion: 'fantasy', pacing: 'calm', intensity: 'medium' }
    case 'cinematic_anime':
      return { emotion: 'epic', pacing: 'dramatic', intensity: 'high' }
    case 'dark_anime':
      return { emotion: 'suspense', pacing: 'suspense', intensity: 'high' }
    case 'comic_panel':
      return { emotion: 'comedy', pacing: 'energetic', intensity: 'medium' }
    case 'custom':
      if (/horror|dark|noir|terror/.test(customBlob)) {
        return { emotion: 'horror', pacing: 'suspense', intensity: 'high' }
      }
      if (/cozy|warm|storybook|gentle/.test(customBlob)) {
        return { emotion: 'warm', pacing: 'calm', intensity: 'low' }
      }
      if (/comic|punchy|energetic/.test(customBlob)) {
        return { emotion: 'comedy', pacing: 'energetic', intensity: 'medium' }
      }
      if (/anime|cinematic|dramatic/.test(customBlob)) {
        return { emotion: 'epic', pacing: 'dramatic', intensity: 'high' }
      }
      return { emotion: 'neutral', pacing: 'moderate', intensity: 'medium' }
    default:
      return null
  }
}

function inferAgeGroup(gender, blob, styleId) {
  if (gender === 'child') return 'child'
  if (gender === 'elder' || gender === 'mythical') return 'elder'
  if (gender === 'anime_hero' || gender === 'female' && styleId === 'cinematic_anime') return 'young_adult'
  if (/\b(teen|adolescent|school)\b/.test(blob)) return 'teen'
  if (/\b(old|ancient|wise|grand)\b/.test(blob)) return 'elder'
  return 'adult'
}

/**
 * Short prose lock for LLM blueprint (non-provider-specific).
 * @param {VoiceProfile} profile
 */
export function summarizeVoiceProfileForBlueprint(profile) {
  return [
    `AI cinematic narrator lock: language=${profile.language}; gender=${profile.gender}; age=${profile.ageGroup}; emotion=${profile.emotionStyle}; pacing=${profile.pacingStyle}; intensity=${profile.intensityLevel}; cinematicStyle=${profile.cinematicStyle}.`,
    'Write narration for premium audiobook delivery — natural breath rhythm, emotional arcs, native pronunciation, soft phrase endings, suspense pauses before reveals.',
    'Avoid flat list-like sentences, robotic rhythm, and English stress patterns when language is not English.',
    `Scene feel: ${profile.emotionStyle} emotion, ${profile.pacingStyle} pacing — immersive storyteller, not announcer.`
  ].join(' ')
}
