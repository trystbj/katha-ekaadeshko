import type { StoryCharacter } from '../types/story'
import { clampLeonardoPromptPair } from '@shared/leonardoPromptLimits.js'

type CharacterDNA = {
  locked?: boolean
  name?: string
  age?: string
  gender?: string
  ethnicity?: string
  regionalOrigin?: string
  skinTone?: string
  facialStructure?: string
  faceShape?: string
  eyeShape?: string
  eyeColor?: string
  hairstyle?: string
  hairColor?: string
  height?: string
  bodyType?: string
  clothing?: string
  accessories?: string
  personality?: string
  occupation?: string
  storyRole?: string
  emotionalTraits?: string
  speakingStyle?: string
  visualDistinguishingFeatures?: string
}

function detailedPromptFromDna(ch: StoryCharacter, styleLock: string, emotionNote?: string): string {
  const dna = (ch as StoryCharacter & { characterDNA?: CharacterDNA }).characterDNA
  const gender =
    ch.gender && String(ch.gender).toLowerCase() !== 'unknown' ? ch.gender : 'neutral'
  if (!dna?.locked) {
    return [
      `STYLE LOCK: ${styleLock}`,
      `CHARACTER: ${ch.name} (${gender}, ${ch.age || 'adult'}).`,
      String(ch.appearance || ch.visualIdentity || ch.personality || '')
    ].join(' ')
  }
  return [
    `SELECTED STYLE: ${styleLock}.`,
    `CHARACTER IDENTITY: ${dna.name}; ${dna.occupation || ch.role}; role ${dna.storyRole}.`,
    `PHYSICAL: ${dna.gender}, age ${dna.age}, ${dna.bodyType}, ${dna.height}, ${dna.skinTone}.`,
    `FACE: ${dna.facialStructure || dna.faceShape}, ${dna.eyeShape}, eyes ${dna.eyeColor}.`,
    `HAIR: ${dna.hairstyle}${dna.hairColor ? `, ${dna.hairColor}` : ''}.`,
    `CLOTHING: ${dna.clothing}; accessories ${dna.accessories}.`,
    `REGIONAL: ${dna.regionalOrigin || dna.ethnicity}; ${dna.ethnicity}; culturally accurate features only.`,
    `PERSONALITY: ${dna.personality}; emotions ${dna.emotionalTraits}; voice ${dna.speakingStyle}.`,
    `DISTINGUISHING: ${dna.visualDistinguishingFeatures || ch.visualIdentity}.`,
    emotionNote ? `EMOTION: ${emotionNote}.` : 'EMOTION: neutral portrait.',
    'POSE: waist-up portrait, one person, clear face.',
    'LIGHTING: soft motivated portrait light. CAMERA: portrait framing.',
    'No text, no watermark, identity locked for all scenes.'
  ].join(' ')
}

export function buildCharacterPortraitPrompt(
  ch: StoryCharacter,
  styleLock: string,
  opts?: { emotionNote?: string; crefLine?: string }
): string {
  const main = [
    detailedPromptFromDna(ch, styleLock, opts?.emotionNote),
    opts?.crefLine || '',
    ch.baseImagePrompt || ''
  ]
    .filter(Boolean)
    .join(' ')
  return clampLeonardoPromptPair(main, '').prompt
}

export function validateCharacterPortraitUrl(url: string): boolean {
  const u = String(url || '').trim()
  return /^https?:\/\//i.test(u) && u.length > 24
}
