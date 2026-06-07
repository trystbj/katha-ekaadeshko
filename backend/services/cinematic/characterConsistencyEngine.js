/**
 * Persistent character visual locks for cross-scene Leonardo generation.
 */

import {
  buildCharacterAppearanceProfile,
  buildCharacterIdentityMemory
} from '../../character/characterIdentityMemory.js'

/**
 * @param {Array<Record<string, unknown>>} bibleCharacters
 * @param {Array<Record<string, unknown>>} [existingLocks]
 */
/**
 * Permanent profiles after story generation (name, age, gender, hair, eyes, clothing, …).
 * @param {Array<Record<string, unknown>>} bibleCharacters
 */
export function buildPermanentCharacterProfiles(bibleCharacters = []) {
  const memory = buildCharacterIdentityMemory(bibleCharacters)
  return memory.map((m) => {
    const p =
      m.appearanceProfile ||
      buildCharacterAppearanceProfile(m.label, m.role || '', m.visualIdentity || '')
    return {
      name: m.label,
      slot: m.slot,
      age: p.age,
      gender: p.gender,
      hairStyle: p.hair,
      hairColor: p.hairColor,
      eyeColor: p.eyeColor,
      clothing: p.clothing,
      accessories: p.accessories,
      facialStructure: p.facialFeatures,
      bodyType: p.bodyType,
      skinTone: p.skinTone || 'locked regional skin tone',
      expressionStyle: p.expressionStyle || 'personality-consistent expressions',
      specialTraits: p.identityTraits,
      visualIdentity: m.visualIdentity,
      baseImagePrompt: m.baseImagePrompt
    }
  })
}

export function buildCharacterVisualLocks(bibleCharacters = [], existingLocks = []) {
  const memory = buildCharacterIdentityMemory(bibleCharacters)
  const byLabel = new Map(
    (Array.isArray(existingLocks) ? existingLocks : []).map((l) => [
      String(l.label || l.characterId || '').toLowerCase(),
      l
    ])
  )

  return memory.map((m, i) => {
    const prior = byLabel.get(m.label.toLowerCase())
    const p =
      m.appearanceProfile ||
      buildCharacterAppearanceProfile(m.label, m.role || '', m.visualIdentity || '')
    const characterId = prior?.characterId || `char_${i + 1}`
    return {
      characterId,
      label: m.label,
      gender: m.gender,
      age: p.age,
      hairStyle: p.hair,
      hairColor: p.hairColor,
      eyeColor: p.eyeColor,
      clothing: p.clothing || prior?.outfitReference,
      accessories: p.accessories,
      bodyType: p.bodyType,
      skinTone: p.skinTone || 'locked',
      expressionStyle: p.expressionStyle || 'consistent emotional range',
      basePortrait: prior?.basePortrait || prior?.baseImageUrl || '',
      faceReference: prior?.faceReference || prior?.basePortrait || '',
      outfitReference: prior?.outfitReference || p.clothing || '',
      styleReference: prior?.styleReference || m.visualIdentity || '',
      visualIdentity: m.visualIdentity,
      baseImagePrompt: m.baseImagePrompt,
      emotionVariants: Array.isArray(prior?.emotionVariants) ? prior.emotionVariants : [],
      poseVariants: Array.isArray(prior?.poseVariants) ? prior.poseVariants : []
    }
  })
}

/**
 * Merge portrait URLs from bible into locks after character still generation.
 * @param {ReturnType<typeof buildCharacterVisualLocks>} locks
 * @param {Array<{ name?: string, baseImageUrl?: string }>} bibleCharacters
 */
export function attachPortraitUrlsToLocks(locks, bibleCharacters = []) {
  if (!Array.isArray(locks) || !locks.length) return locks
  return locks.map((lock) => {
    const hit = bibleCharacters.find(
      (c) => String(c.name || '').trim().toLowerCase() === String(lock.label || '').toLowerCase()
    )
    const url = hit?.baseImageUrl ? String(hit.baseImageUrl) : lock.basePortrait
    if (!url) return lock
    return {
      ...lock,
      basePortrait: url,
      faceReference: url,
      styleReference: lock.styleReference || hit?.visualIdentity || lock.visualIdentity
    }
  })
}

/**
 * @param {ReturnType<typeof buildCharacterVisualLocks>} locks
 */
export function characterConsistencyPromptBlock(locks = []) {
  if (!locks.length) return ''
  const lines = locks.map((c) => {
    const vi = String(c.visualIdentity || c.styleReference || '').trim()
    return [
      `${c.label} (${c.gender}, age ${c.age || 'locked'}) — PERMANENT PROFILE LOCK:`,
      `face ${c.facialStructure || vi.slice(0, 80) || 'locked'};`,
      `hair ${c.hairStyle || 'locked'}${c.hairColor ? ` (${c.hairColor})` : ''};`,
      `eyes ${c.eyeColor || 'locked'}; skin ${c.skinTone || 'locked'};`,
      `body ${c.bodyType || 'locked'}; outfit ${c.outfitReference || c.clothing || 'locked wardrobe'};`,
      `accessories ${c.accessories || 'same every scene'};`,
      `expression style ${c.expressionStyle || 'consistent'};`,
      `face ref ${c.faceReference || c.basePortrait || 'scene-1 likeness'}.`
    ].join(' ')
  })
  return [
    'CHARACTER CONSISTENCY ENGINE — non-negotiable (inject into every scene):',
    ...lines,
    'Lock face, hairstyle, hair color, clothing, age, body type, accessories, skin tone, and expression style.',
    'Store once — reuse in every scene prompt automatically.',
    'Never swap genders, age, face structure, wardrobe palette, or art style between scenes.'
  ].join('\n')
}
