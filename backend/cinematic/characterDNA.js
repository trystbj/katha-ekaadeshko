/**
 * CharacterDNA — immutable visual identity locked at story generation.
 */

import { buildCharacterAppearanceProfile } from '../../shared/characterNamingPolicy.js'
import { pipelineStageLog } from '../utils/pipelineStageLog.js'

function extractTrait(blob, patterns, fallback = '') {
  const t = String(blob || '')
  for (const re of patterns) {
    const m = t.match(re)
    if (m?.[0]) return m[0].trim().slice(0, 120)
  }
  return fallback
}

/**
 * @param {Record<string, unknown>} character
 * @param {{ country?: string, theme?: string }} [opts]
 */
export function buildCharacterDNA(character = {}, opts = {}) {
  const name = String(character.name || 'Character').trim()
  const traits = String(character.traits || character.personality || '').trim()
  const visual = String(character.visualIdentity || character.appearance || traits).trim()
  const blob = `${name} ${traits} ${visual}`
  const profile = buildCharacterAppearanceProfile(name, traits, visual)
  let gender = String(character.gender || profile.gender || '').toLowerCase()
  if (!gender || gender === 'unknown') gender = profile.gender === 'unknown' ? 'neutral' : profile.gender

  const ethnicity =
    String(character.ethnicity || '').trim() ||
    (/\b(nepal|nepali|himalaya)\b/i.test(blob)
      ? 'Nepali / Himalayan South Asian'
      : /\b(india|indian|sari|kurta)\b/i.test(blob)
        ? 'South Asian'
        : 'regionally authentic to the story setting')

  const race =
    String(character.race || '').trim() ||
    (ethnicity.includes('Asian')
      ? 'South/East Asian'
      : ethnicity.includes('European')
        ? 'European'
        : ethnicity.includes('African')
          ? 'African'
          : ethnicity.includes('Middle Eastern')
            ? 'Middle Eastern'
            : 'story-authentic')

  const skinTone =
    extractTrait(visual, [
      /\b(fair|light|medium|olive|tan|brown|dark|deep)\s+skin\b/i,
      /\b(pale|bronze|golden)\s+complexion\b/i
    ]) || 'consistent skin tone from story'

  const faceShape =
    extractTrait(visual, [/\b(oval|round|heart-shaped|square|angular)\s+face\b/i]) ||
    profile.facialFeatures ||
    'consistent face shape'

  const eyeShape =
    extractTrait(visual, [/\b(almond|round|hooded|wide-set|narrow)\s+eyes?\b/i]) || 'consistent eye shape'

  const height =
    extractTrait(visual, [/\b(short|tall|petite|average height|\d\s*ft|\d\s*cm)\b/i]) ||
    'height consistent with age and body type'

  const dna = {
    locked: true,
    name,
    age: String(character.age || profile.age || 'adult').trim(),
    gender,
    ethnicity,
    race,
    skinTone,
    faceShape,
    eyeShape,
    eyeColor: String(character.eyeColor || profile.eyeColor || 'locked eye color').trim(),
    hairstyle: String(character.hairStyle || profile.hair || 'locked hairstyle').trim(),
    hairColor: String(character.hairColor || profile.hairColor || '').trim(),
    bodyType: String(character.bodyType || profile.bodyType || 'consistent proportions').trim(),
    height,
    clothing: String(character.clothing || profile.clothing || 'locked wardrobe').trim(),
    accessories: String(character.accessories || profile.accessories || 'same accessories').trim(),
    personality: String(character.personality || traits || 'story-consistent').trim(),
    storyRole: String(character.storyRole || character.role || 'lead').trim(),
    visualIdentity: visual.slice(0, 520)
  }

  pipelineStageLog('character_dna_locked', { name: dna.name, gender: dna.gender })
  return Object.freeze(dna)
}

/**
 * @param {Array<Record<string, unknown>>} characters
 * @param {{ country?: string, theme?: string }} [opts]
 */
export function buildAllCharacterDNA(characters = [], opts = {}) {
  if (!Array.isArray(characters)) return []
  return characters.map((c) => buildCharacterDNA(c, opts))
}

/**
 * @param {ReturnType<typeof buildCharacterDNA>} dna
 */
export function characterDNAPromptBlock(dna) {
  if (!dna?.name) return ''
  return (
    `CHARACTER DNA LOCK — ${dna.name} (immutable): ` +
    `${dna.gender}, age ${dna.age}, ${dna.ethnicity}, ${dna.race}, ${dna.skinTone}; ` +
    `face ${dna.faceShape}, ${dna.eyeShape}, eyes ${dna.eyeColor}; ` +
    `hair ${dna.hairstyle}${dna.hairColor ? ` (${dna.hairColor})` : ''}; ` +
    `body ${dna.bodyType}, ${dna.height}; wardrobe ${dna.clothing}; ${dna.accessories}; ` +
    `role ${dna.storyRole}; ${dna.personality}. ` +
    `Never change age, gender, ethnicity, face, hair, or clothing unless script explicitly states outfit change.`
  ).slice(0, 680)
}

/**
 * @param {ReturnType<typeof buildCharacterDNA>} dna
 * @param {string} storyBlob
 */
export function assertCharacterDNAMatchesStory(dna, storyBlob = '') {
  const issues = []
  const blob = String(storyBlob || '').toLowerCase()
  if (!blob.trim()) return { ok: true, issues }

  const g = String(dna.gender || '').toLowerCase()
  if (g === 'female' && /\b(man|male|boy|husband|father)\b/.test(blob) && !/\b(woman|female|girl|wife|mother)\b/.test(blob)) {
    issues.push('gender_story_mismatch')
  }
  if (g === 'male' && /\b(woman|female|girl|wife|mother)\b/.test(blob) && !/\b(man|male|boy|husband|father)\b/.test(blob)) {
    issues.push('gender_story_mismatch')
  }

  const eth = String(dna.ethnicity || '').toLowerCase()
  if (eth.includes('nepali') && /\b(european|blonde|scandinavian)\b/.test(blob)) {
    issues.push('ethnicity_story_mismatch')
  }

  return { ok: issues.length === 0, issues }
}

/**
 * @param {ReturnType<typeof buildCharacterDNA>[]} dnaList
 * @param {Record<string, unknown>} scriptRow
 */
export function characterDNABlockForScene(dnaList = [], scriptRow = {}) {
  const blob = `${scriptRow.visual_description || ''} ${scriptRow.narration || ''}`.toLowerCase()
  const inScene = dnaList.filter((d) => {
    const n = String(d.name || '').toLowerCase()
    return n.length > 2 && blob.includes(n)
  })
  const cast = inScene.length ? inScene : dnaList.slice(0, 2)
  return cast.map((d) => characterDNAPromptBlock(d)).filter(Boolean).join(' ')
}
