import type { StoryCharacter } from '../types/story'
import { clampLeonardoPromptPair } from '@shared/leonardoPromptLimits.js'

function dnaPromptLine(ch: StoryCharacter): string {
  const dna = (ch as StoryCharacter & { characterDNA?: Record<string, unknown> }).characterDNA as
    | {
        locked?: boolean
        hairstyle?: string
        hairColor?: string
        eyeColor?: string
        clothing?: string
        faceShape?: string
        skinTone?: string
        ethnicity?: string
      }
    | undefined
  if (!dna?.locked) return ''
  return (
    `CHARACTER DNA LOCK: ${ch.name}; ${dna.ethnicity || ''}; hair ${dna.hairstyle || ''} ${dna.hairColor || ''}; ` +
    `eyes ${dna.eyeColor || ''}; face ${dna.faceShape || ''}; skin ${dna.skinTone || ''}; wardrobe ${dna.clothing || ''}.`
  )
}

export function buildCharacterPortraitPrompt(
  ch: StoryCharacter,
  styleLock: string,
  opts?: { emotionNote?: string; crefLine?: string }
): string {
  const gender =
    ch.gender && String(ch.gender).toLowerCase() !== 'unknown' ? ch.gender : 'neutral'
  const appearance = String(ch.appearance || ch.visualIdentity || ch.personality || '').trim()
  const parts = [
    `STYLE LOCK — highest authority, single medium only: ${styleLock}`,
    dnaPromptLine(ch),
    opts?.crefLine || '',
    `CHARACTER: ${ch.name} (${gender}, ${ch.age || 'adult'}).`,
    `Appearance: ${appearance}.`,
    ch.baseImagePrompt,
    `Role: ${ch.role || 'story lead'}.`,
    opts?.emotionNote ? `Expression: ${opts.emotionNote}` : 'Neutral expression, clear face.',
    'Portrait or waist-up, one person only, no text, no watermark, same identity for all scenes.'
  ]
  return clampLeonardoPromptPair(parts.filter(Boolean).join(' '), '').prompt
}

export function validateCharacterPortraitUrl(url: string): boolean {
  const u = String(url || '').trim()
  return /^https?:\/\//i.test(u) && u.length > 24
}
