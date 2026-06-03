/**
 * Persistent character visual locks for cross-scene Leonardo generation.
 */

import { buildCharacterIdentityMemory } from '../../character/characterIdentityMemory.js'

/**
 * @param {Array<Record<string, unknown>>} bibleCharacters
 * @param {Array<Record<string, unknown>>} [existingLocks]
 */
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
    const characterId = prior?.characterId || `char_${i + 1}`
    return {
      characterId,
      label: m.label,
      gender: m.gender,
      basePortrait: prior?.basePortrait || prior?.baseImageUrl || '',
      faceReference: prior?.faceReference || prior?.basePortrait || '',
      outfitReference: prior?.outfitReference || m.clothing || '',
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
    const hair = (vi.match(/\b(hair|braid|bun|locks)[^.]{0,70}/i) || ['locked hairstyle'])[0]
    const outfit = c.outfitReference || (vi.match(/\b(dress|sari|kurta|coat|robe|jacket)[^.]{0,70}/i) || [''])[0] || 'locked wardrobe'
    return [
      `${c.label} (${c.gender}) — PERMANENT PROFILE:`,
      `hair ${hair}; outfit ${outfit};`,
      `face ref ${c.faceReference || c.basePortrait || 'scene-1 likeness'};`,
      `visual identity ${vi || c.baseImagePrompt}.`
    ].join(' ')
  })
  return [
    'CHARACTER CONSISTENCY ENGINE — non-negotiable:',
    ...lines,
    'Store and reuse this profile in every scene prompt automatically.',
    'Same exact character from previous scenes — hair style, hair color, eye color, age, gender, clothing, body type, accessories, facial features unchanged.',
    'Never swap genders, age, face structure, or art style between scenes. Reuse the same cast only.'
  ].join('\n')
}
