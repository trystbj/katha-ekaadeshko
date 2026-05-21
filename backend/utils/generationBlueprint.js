/**
 * Hard-locks user-facing generation choices into a single blueprint block injected into all LLM prompts.
 * Priority when conflicts arise: custom seed → genre → theme bundle → region → language → narrator → visual → mood → music → audience.
 */

import { getNarratorPreset } from './narratorPresets.js'
import { voiceDirectorBlueprintSection } from '../voice/voiceDirector.js'
import { memoryContinuityBlueprintBlock } from '../cinematic/storyMemoryContinuity.js'
import { worldSimulationBlueprintBlock } from '../cinematic/worldSimulation.js'
import { relationshipBlueprintBlock } from '../cinematic/emotionalRelationshipEngine.js'
import { creatorPreferencesBlueprintBlock } from '../cinematic/creatorPreferenceLearning.js'
import { compactSeedLineForPipeline } from '../../shared/storyIdeaLimits.js'
import { analyzeNamingPolicy } from '../../shared/characterNamingPolicy.js'
import { cinematicWritingBlueprintSection } from '../cinematic/cinematicStoryWriting.js'

/** Base language code → human label for prompts */
const LANG_LABEL = {
  ne: 'Nepali (नेपाली)',
  en: 'English',
  hi: 'Hindi',
  bn: 'Bengali',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  'zh-cn': 'Chinese (Simplified)',
  id: 'Indonesian',
  ms: 'Malay',
  th: 'Thai',
  vi: 'Vietnamese',
  tl: 'Filipino',
  fil: 'Filipino',
  ar: 'Arabic',
  fa: 'Persian',
  he: 'Hebrew',
  el: 'Greek',
  cs: 'Czech',
  nl: 'Dutch',
  pl: 'Polish',
  tr: 'Turkish',
  uk: 'Ukrainian',
  ur: 'Urdu',
  ta: 'Tamil',
  te: 'Telugu',
  mr: 'Marathi',
  pa: 'Punjabi'
}

export function languageDisplayName(code) {
  const raw = String(code || 'en').trim()
  const base = raw.split(/[-_]/)[0].toLowerCase()
  const compound = raw.toLowerCase()
  return LANG_LABEL[compound] || LANG_LABEL[base] || raw || 'English'
}

export function normalizePipelineInput(input) {
  const src = input && typeof input === 'object' ? input : {}
  const storyLanguage = String(src.storyLanguage || 'en').trim() || 'en'
  const rawAge = src.audienceAgeCategory != null ? String(src.audienceAgeCategory).trim() : ''
  const audienceAgeCategory = rawAge ? rawAge.slice(0, 48) : undefined
  const rawSeed = src.seedLine != null ? String(src.seedLine).trim() : ''
  const seedLine = rawSeed ? compactSeedLineForPipeline(rawSeed) : undefined
  const { audienceAgeCategory: _omitAge, ...rest } = src
  return {
    ...rest,
    storyLanguage,
    seedLine,
    ...(rawSeed ? { seedLineRaw: rawSeed, seedLineFullChars: rawSeed.length } : {}),
    ...(audienceAgeCategory ? { audienceAgeCategory } : {})
  }
}

function summarizeNarrator(narratorId) {
  try {
    const p = getNarratorPreset(String(narratorId || '').trim())
    const ins = String(p.instructions || '').replace(/\s+/g, ' ').trim()
    return ins ? ins.slice(0, 380) + (ins.length > 380 ? '…' : '') : `preset "${p.id}"`
  } catch {
    return `preset "${String(narratorId || '').trim() || 'default'}"`
  }
}

function visualLockSummary(input) {
  const sid = String(input.styleId || '').trim() || 'studio_default'
  if (sid === 'custom') {
    const c = String(input.customVisualPrompt || '').trim()
    return `custom card — ${c ? c.slice(0, 220) + (c.length > 220 ? '…' : '') : '(empty)'}`
  }
  const accent = String(input.visualAccent || '').trim()
  return `${sid}${accent ? ` · accent: ${accent.slice(0, 120)}` : ''}`
}

function genreIntegrity(genre) {
  const g = String(genre || '').toLowerCase()
  const lines = []
  if (!g) return ''
  if (g.includes('horror')) {
    lines.push(
      'Horror lock: sustain dread/tension-friendly pacing; no gratuitous comedy relief unless GENRE explicitly blends humor; visuals and beats stay uneasy/suspense-capable.'
    )
  }
  if (g.includes('comedy') || g.includes('funny')) {
    lines.push(
      'Comedy lock: allow playful timing, lighter interpersonal friction, humor-forward dialogue — do not drag story into pure bleak horror unless GENRE also demands it.'
    )
  }
  if (g.includes('mystery') || g.includes('thriller') || g.includes('crime')) {
    lines.push(
      'Mystery/thriller lock: investigative tension, clues, restrained revelations — avoid random tonal whiplash into unrelated rom-com or slapstick unless GENRE explicitly combines those.'
    )
  }
  if (g.includes('romance')) {
    lines.push('Romance lock: emotional through-line and relationship stakes stay central when plot allows.')
  }
  if (g.includes('folk') || g.includes('myth') || g.includes('legend')) {
    lines.push(
      'Oral-tradition / folk texture: prefer grounded communal storytelling rhythm — avoid Hollywood spectacle clichés unless seed asks for modern blockbuster scale.'
    )
  }
  return lines.join('\n')
}

function regionNepalLock(country) {
  const c = String(country || '').trim().toLowerCase()
  if (c !== 'nepal') return ''
  return `Nepal region lock (automatic):
- Use Nepal-authentic given names and place flavor (hills, Tarai, Kathmandu Valley, trekking corridors, villages, festivals) as fits the SEED — never default silently to unrelated foreign cities.
- Respect Nepali cultural context: dress, architecture, soundscape, festivals (Dashain/Tihar/Lhosar/etc. only when fitting), social norms — avoid stereotype caricature.
- Environment: Himalayas / middle hills / urban Nepal consistent with SCENE; do not substitute unrelated countries as the primary setting.`.trim()
}

function languageLock(langCode, langDisplay) {
  const code = String(langCode || 'en').trim().toLowerCase()
  const base = code.split(/[-_]/)[0]
  let extra = ''
  if (base === 'ne') {
    extra =
      '\nNepali output lock: prose, narration voice, and dialogue must read as natural Nepali; avoid English lines except brief loanwords where culturally normal for the chosen setting.'
  }
  return `Primary story language: ${langDisplay} (code ${code}).
All story prose, script narration, and spoken dialogue MUST be written in this language end-to-end unless the USER SEED explicitly requests bilingual framing (if bilingual, still keep ${langDisplay} dominant).
Do not mix unrelated lingua franca chunks.${extra}`
}

function memoryContinuityLock(input) {
  const snap = input?.storyMemorySnapshot
  if (snap && typeof snap === 'object') {
    const block = memoryContinuityBlueprintBlock(snap)
    if (block) return `\n\n${block}`
  }
  const prior = String(input?.priorMemorySummary || '').trim()
  if (!prior) return ''
  return `\n\nSTORY MEMORY & CONTINUITY (project — honor in all scenes):\n${prior.slice(0, 2200)}`
}

function evolutionContinuityLock(input) {
  const parts = []
  const worldBlock = worldSimulationBlueprintBlock(input?.priorWorldState)
  if (worldBlock) parts.push(worldBlock)
  const relBlock = relationshipBlueprintBlock(input?.priorRelationships)
  if (relBlock) parts.push(relBlock)
  const prefBlock = creatorPreferencesBlueprintBlock(input?.creatorPreferences)
  if (prefBlock) parts.push(prefBlock)
  if (!parts.length) return ''
  return `\n\n${parts.join('\n\n')}`.slice(0, 3200)
}

function soundtrackPacingLock(genre, storyTone, theme) {
  const g = String(genre || '').toLowerCase()
  const tone = String(storyTone || '').toLowerCase()
  const th = String(theme || '').toLowerCase()
  const bits = []
  if (g.includes('horror')) bits.push('sonic posture: tense/low-frequency dread-friendly story pacing (ambient bed will skew suspense).')
  if (g.includes('comedy')) bits.push('sonic posture: lighter rhythmic dialogue beats acceptable.')
  if (tone.includes('slow') || tone.includes('calm')) bits.push('Honor slower reflective pacing in prose.')
  if (tone.includes('tense') || tone.includes('dark')) bits.push('Keep pressure forward; avoid cuddly tonal resets.')
  if (th.includes('folk')) bits.push('Prefer acoustic/traditional story rhythm over glossy cinematic irony.')
  if (!bits.length) bits.push('Keep pacing aligned with genre + mood tags above — no random tonal remix.')
  return bits.join(' ')
}

export function buildGenerationBlueprint(input) {
  const normalized = normalizePipelineInput(input)
  const seedLine = String(normalized.seedLine || '').trim()
  const theme = String(normalized.theme || '').trim()
  const genre = String(normalized.genre || '').trim()
  const country = String(normalized.country || '').trim()
  const storyLanguage = normalized.storyLanguage
  const langDisplay = languageDisplayName(storyLanguage)
  const storyTone = normalized.storyTone ? String(normalized.storyTone).trim() : ''
  const length = String(normalized.length || '').trim()
  const narratorId = String(normalized.narratorId || '').trim()
  const audienceLine = normalized.audienceAgeCategory
    ? `\n10) Audience age band (locked): ${normalized.audienceAgeCategory} — keep themes/voice appropriate; do not infantilize adult locks.`
    : '\n10) Audience age band: general (studio default — stay broadly accessible unless seed specifies otherwise).'

  const voiceDirectorLine = voiceDirectorBlueprintSection({
    storyLanguage: normalized.storyLanguage,
    genre: normalized.genre,
    theme: normalized.theme,
    storyTone: normalized.storyTone,
    styleId: normalized.styleId,
    customVisualPrompt: normalized.customVisualPrompt,
    narratorId: normalized.narratorId,
    seedLine: normalized.seedLine,
    autoVoiceDirector: normalized.autoVoiceDirector !== false,
    narratorGenderPreference: normalized.narratorGenderPreference,
    languageId: normalized.narrationLanguageId
  })
  const voiceDirectorBlock = voiceDirectorLine
    ? `\n\nAI NARRATOR VOICE DIRECTOR (automatic delivery lock):\n${voiceDirectorLine}`
    : ''
  const memoryBlock = memoryContinuityLock(normalized)
  const evolutionBlock = evolutionContinuityLock(normalized)
  const namingPolicy = analyzeNamingPolicy(seedLine, theme)
  const namingBlock =
    namingPolicy.blueprintLines.length > 0
      ? `\n\n${namingPolicy.blueprintLines.join('\n')}`
      : ''

  const blueprintBlock = `GENERATION BLUEPRINT — USER LOCKS (non-negotiable)

INTERNAL CONFIRMATION STEP (silent): Before returning JSON, verify every section below is honored. If anything fights the USER SEED, obey the priority order.

PRIORITY WHEN INSTRUCTIONS CONFLICT (highest wins):
1) USER SEED / custom request: ${seedLine ? `"${seedLine.replace(/"/g, '\\"')}"` : '(none supplied — use studio fields only)'}
2) Locked GENRE: ${genre || '(unspecified)'}
3) Story-type / theme bundle (subgenre hooks live here): ${theme || '(unspecified)'}
4) Locked REGION anchor: ${country || '(unspecified)'}
5) Locked OUTPUT LANGUAGE: ${langDisplay}
${languageLock(storyLanguage, langDisplay)}
6) Locked NARRATOR delivery intent: ${summarizeNarrator(narratorId)}
7) Locked VISUAL STYLE card (also enforced again in visual sections): ${visualLockSummary(normalized)}
8) Locked MOOD / pacing tag: ${storyTone || '(neutral — follow genre default pacing)'}
9) Locked LENGTH bucket: ${length || '(studio default)'}
${audienceLine}
${namingBlock}
${cinematicWritingBlock}

GENRE INTEGRITY (auto-applied):
${genreIntegrity(genre) || '- Maintain strict fidelity to declared GENRE; no stealth genre-swapping.'}

REGION INTERPRETATION:
${regionNepalLock(country) || `- Anchor tangible setting detail to: ${country || 'chosen region'} — names, geography, and cultural specificity must match.`}

SOUNDTRACK / ATMOSPHERE ALIGNMENT (story text must not contradict later audio):
${soundtrackPacingLock(genre, storyTone, theme)}

CUSTOM SEED PARSING:
- Extract extra theme, mood, palette, pacing, or locale cues ONLY when the USER SEED states them plainly.
- Never override higher-priority locks with unrelated “creative” defaults.
- Do not invent contradictory B-plots, gag runners, or alternate genres absent from GENRE + SEED.

SCENE & SCRIPT FIDELITY (mandatory):
- Every scene must advance the USER SEED plot — no filler vignettes unrelated to the request.
- visual_description must depict the same location, cast, action, emotion, and time-of-day as narration for that scene.
- characters_in_shot, mood, environment, lighting, and camera fields must align with the seed’s genre, tone, and relationships.
- Maintain narrative continuity: costumes, relationships, and emotional arc carry forward unless the seed says otherwise.

ABSOLUTE TABOOS:
- Mixing primary prose/dialogue language away from lock ${langDisplay} without explicit bilingual permission in the SEED.
- Relocating the core setting to a different nation/culture than ${country || 'the locked region'} unless the USER SEED explicitly demands that relocation.
- Injecting tonal additives from unrelated genres (e.g., comedy hijinks inside a straight mystery/horror lock) unless GENRE or SEED explicitly blends them.${memoryBlock}${evolutionBlock}${voiceDirectorBlock}`

  return {
    blueprintBlock,
    languageDisplayName: langDisplay,
    compactMeta: {
      genre,
      country,
      storyLanguage,
      storyTone: storyTone || undefined,
      narratorId: narratorId || undefined,
      styleId: normalized.styleId,
      audienceAgeCategory: normalized.audienceAgeCategory,
      seedPresent: Boolean(seedLine)
    }
  }
}

export function buildBlueprintCompliancePrompt(input, storyJson) {
  const blueprint = String(input.__generationBlueprint || '').trim()
  return `You are a strict blueprint compliance checker.

BLUEPRINT (locks):
${blueprint || '(missing blueprint)'}

STORY JSON TO AUDIT:
${JSON.stringify(storyJson)}

Task: Decide whether the story JSON violates ANY hard lock above (wrong primary geography/culture vs region lock, wrong dominant language register vs language lock, major genre tone betrayal vs GENRE lock, invented contradictory subplot violating USER SEED priority).

Return JSON ONLY with EXACT keys:
{
  "compliant": boolean,
  "violations": string
}

Use empty string for violations when compliant is true. Keep violations as short actionable bullets (max 400 chars).`
}
