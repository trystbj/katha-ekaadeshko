/**
 * Nepali pronunciation intelligence — phonetic normalization, native accent lock,
 * storytelling rhythm, and narrator personality (modular; used by global TTS pipeline).
 */

import { normalizeNarratorId } from '../utils/narratorVoiceEngine.js'

/** @param {string} [code] */
export function isNepaliLanguage(code) {
  const base = String(code || '')
    .trim()
    .toLowerCase()
    .split(/[-_]/)[0]
  return base === 'ne'
}

/** Common mis-typed forms → preferred Nepali spelling for TTS clarity. */
const SPELLING_NORMALIZE = [
  [/तपाईं/g, 'तपाईँ'],
  [/तिमीं/g, 'तिमीँ'],
  [/।\s*।/g, '।'],
  [/\s+([,;])/g, '$1']
]

/**
 * Nepali text normalization before TTS (Devanagari-safe).
 * @param {string} text
 * @returns {{ text: string, hints: string }}
 */
export function preprocessNepaliForTts(text) {
  let t = String(text || '')
    .normalize('NFC')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim()

  if (!t) return { text: '', hints: '' }

  for (const [re, rep] of SPELLING_NORMALIZE) {
    t = t.replace(re, rep)
  }

  t = t.replace(/\.{3,}/g, '…')
  t = t.replace(/([।.!?])\s*/g, '$1 ')
  t = t.replace(/\s+([,])/g, '$1 ')
  t = t.replace(/\s{2,}/g, ' ').trim()

  const hints = [
    'Nepali phonetics: pronounce every akshara fully — no swallowed syllables, no English stress on Nepali words.',
    'Retroflex ट ठ ड ढ ण vs dental त थ द ध न — never merge or anglicize.',
    'Sibilants: श (palatal) vs ष (retroflex) vs स (dental) — distinct native Nepali sounds.',
    'Conjuncts: त्र ज्ञ श्र क्ष — pronounce as single Nepali clusters, not letter-by-letter English spelling.',
    'Chandrabindu ँ and anusvara ं: audible on छौँ, जाँदै, गर्छु, हुँ, तपाईँ, काँडा — not silent.',
    'Vowel length: distinguish short अ vs long आ, इ vs ई, उ vs ऊ in meaning-bearing pairs.',
    'Compounds: natural stress on कथाको, संसारमा, मनमोहक, रोमाञ्चक — smooth linking, not chopped.',
    'Mixed Latin names in text: Nepali loan pronunciation (no English spell-out unless clearly English dialogue).'
  ]

  if (/[«""„"']/.test(t)) {
    hints.push(
      'Nepali dialogue: micro-pause entering and leaving quotes; stay storyteller — slight tint on quoted line, no cartoon voices.'
    )
  }
  if (/[A-Za-z]{2,}/.test(t)) {
    hints.push('Embedded English words: Kathmandu Nepali accent on loanwords — not American English insertion.')
  }
  if (t.length > 160) {
    hints.push('Long Nepali passage: clause-level breathing; slow slightly on emotional peaks; keep folk-story continuity.')
  }
  if (/[!?]/.test(t)) {
    hints.push('Emotional punctuation: let ! and ? shape melody — not louder volume, but Nepali intonation rise/fall.')
  }

  return { text: t, hints: hints.join(' ') }
}

/**
 * Core Nepali delivery lock for OpenAI TTS instructions.
 * @param {{ extendedPreview?: boolean }} [opts]
 * @param {Record<string, unknown>} [ctx]
 */
export function nepaliDeliveryInstructionBlock(opts = {}, ctx = {}) {
  const extended = Boolean(opts.extendedPreview)
  const parts = [
    'NEPALI NATIVE LOCK: Kathmandu-standard Nepali only — NEVER Hindi (देवनागरी Hindi stress), NEVER English sentence rhythm.',
    'Accent: oral-tradition katha bhet — warm, musical, conversational Nepali melody with natural clause linking.',
    'Anti-patterns: no Bollywood Hindi cadence, no Sanskritized priest chant, no news-anchor stiffness, no robotic equal syllables.',
    'Phoneme discipline: full vowels; crisp consonant endings; nasal ँ/ं audible; retroflex series distinct from dental.',
    'Names/places: Nepali geographic rhythm — पशुपति, पोखरा, काठमाडौँ, हिमाल — as locals say them.',
    'Fantasy/cultural terms in Devanagari: pronounce as Nepali morphology, not English fantasy spelling.'
  ]

  if (extended) {
    parts.push(
      'Preview mode: slow enough for retroflex and chandrabindu to land; showcase calm, suspense, quoted dialogue, and warm ending in one Nepali arc.'
    )
  }

  parts.push(nepaliNarratorPersonalityBlock(ctx?.narratorId))
  return parts.filter(Boolean).join(' ')
}

/**
 * @param {string} [narratorId]
 */
export function nepaliNarratorPersonalityBlock(narratorId) {
  const id = normalizeNarratorId(narratorId)
  if (id === 'penguin') {
    return [
      'Female Nepali katha voice: cute sweet warm soft — light feminine head tone, smile in phrases, cozy immersive.',
      'Sentence endings: gentle downward Nepali lilt; tenderness without childish squeak or anime exaggeration.',
      'Forbidden: Hindi film heroine accent, husky alto, chest-heavy resonance, artificial high chirp.'
    ].join(' ')
  }
  return [
    'Male Nepali katha voice: cinematic calm warm — natural mid baritone storyteller, confident but never announcer-deep.',
    'Pacing: smooth emotional arcs; cinematic pause before reveals; folk-host intimacy like fireside katha.',
    'Forbidden: gravel trailer voice, monotone grave drag, aggressive bark, Hindi male-lead cadence.'
  ].join(' ')
}

/**
 * Nepali storytelling rhythm from scene emotion.
 * @param {Record<string, unknown>} ctx
 * @param {{ speedMul?: number, pauseBiasMs?: number, warmth?: number, cinematicIntensity?: number, whisperBias?: number }} [emotion]
 */
export function nepaliStoryRhythmBlock(ctx, emotion = {}) {
  const blob = `${ctx?.narration || ''}\n${ctx?.visualDescription || ''}`.toLowerCase()
  const parts = [
    'Nepali story rhythm: follow natural बोलचाल — slightly stretch emotional words, glide through connective particles (र, को, मा, ले).'
  ]

  if (emotion.whisperBias > 0.12 || /\b(रहस्य|गुप्त|डर|भय)\b/.test(blob)) {
    parts.push('Suspense: tighter clause gaps, hushed Nepali proximity, pause before reveal word — still clear consonants.')
  }
  if (emotion.warmth > 0.6 || /\b(माया|मिठो|न्यानो|प्यार|हाँस)\b/.test(blob)) {
    parts.push('Warmth: round vowels, soft phrase endings, gentle smile — like comforting a friend in Nepali.')
  }
  if (/\b(रुन|दुःख|विछोड|मृत्यु|अश्रु)\b/.test(blob)) {
    parts.push('Sadness: slower Nepali flow, fragile breath, never melodramatic wail — human katha tenderness.')
  }
  if (/\b(हाँस|हास|खुसी|उत्सव)\b/.test(blob)) {
    parts.push('Joy: brighter Nepali pitch contour, light rhythmic lift — still intelligible, not cartoon.')
  }
  if (/\b(युद्ध|दौड|हल्ला|चर्को)\b/.test(blob)) {
    parts.push('Action: forward Nepali momentum, stressed verb roots — no English staccato shouting.')
  }
  if (emotion.cinematicIntensity > 0.55) {
    parts.push('Climax: one breath before key phrase, then clear Nepali peak — disciplined, not shout.')
  }

  return parts.join(' ')
}

/**
 * @param {string} text
 */
export function nepaliDialogueFlowHints(text) {
  if (!/[«""„"']/.test(String(text || ''))) return ''
  return [
    'Nepali quoted speech: natural बोलचाल in quotes; return to narrator warmth immediately after.',
    'No character voice acting — one Nepali storyteller throughout.'
  ].join(' ')
}
