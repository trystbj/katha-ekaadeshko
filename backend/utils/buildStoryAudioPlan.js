import { pickBedForGenrePhase, nepalRegionalContext, SFX_BY_TAG } from './storyAudioCatalog.js'

/** Align with worker slideshow default / scenesWebVtt.SECONDS_PER_RENDER_SCENE */
export const DEFAULT_SECONDS_PER_SCENE = 4

/**
 * @param {number} i 0-based scene index
 * @param {number} n scene count
 */
export function inferNarrativePhase(i, n, narration, visual, storyTone) {
  const text = `${narration || ''} ${visual || ''}`.toLowerCase()
  const tone = String(storyTone || '').toLowerCase().trim()
  const pos = n <= 1 ? 0 : i / Math.max(1, n - 1)

  if (i === 0) return 'intro'
  if (i === n - 1) return 'ending'
  if (pos >= 0.78) return 'climax'
  if (/reveal|discovered|truth\b|secret\b|twist|uncovered|खुलासा|रहस्य खुल/i.test(text)) return 'reveal'
  if (/cry|tear|heartbreak|goodbye|loss|mourning|alone\b|grief|शोक|अन्धकार आत्मा/i.test(text)) return 'emotional'
  if (
    tone === 'tense' ||
    /tension|footsteps behind|waiting in the dark|silent corridor|someone watching|डर लाग/i.test(text)
  )
    return 'tension'
  return 'body'
}

function phaseIntensity(phase) {
  switch (phase) {
    case 'intro':
      return 0.28
    case 'tension':
      return 0.58
    case 'reveal':
      return 0.76
    case 'emotional':
      return 0.36
    case 'climax':
      return 0.95
    case 'ending':
      return 0.3
    default:
      return 0.46
  }
}

/** First matching tag wins per scene (priority order). */
const SFX_RULES = [
  { tag: 'thunder', re: /\b(thunder|lightning|bolt\b|चट्याङ)/i },
  { tag: 'rain', re: /\b(rain|raining|downpour|storm\b|पानी परे|वर्षा)/i },
  { tag: 'wind', re: /\b(wind\b|gust\b|howling air|हुरी)/i },
  { tag: 'forest', re: /\b(forest|jungle|woods|trees\b|वन\b)/i },
  { tag: 'birds', re: /\b(birds?\b|chirping|morning song)/i },
  { tag: 'river', re: /\b(river|stream\b|flowing water|नदी)/i },
  { tag: 'splash', re: /\b(splash|splashing|falls into water)/i },
  { tag: 'fire', re: /\b(fire\b|flames|burning hut|campfire|आगो)/i },
  { tag: 'crowd', re: /\b(crowd|market\b|bazaar|busy street|हाटबजार)/i },
  { tag: 'city', re: /\b(city\b|traffic|urban night|skyscrapers|honking horns)/i },
  { tag: 'village', re: /\b(village|hamlet|rural morning|गाउँ)/i },
  { tag: 'bell', re: /\b(bell\b|temple chime|घण्टी)/i },
  { tag: 'horse', re: /\b(horse|gallop|caravan|घोडा)/i },
  { tag: 'vehicle', re: /\b(car\b|truck|bus\b|motorcycle|engine rev)/i },
  { tag: 'footsteps', re: /\b(footsteps|walking closer|creaking floorboards)/i },
  { tag: 'door', re: /\b(door\b|creaking door|knock\b|खुकुलो)/i },
  { tag: 'sword', re: /\b(sword|clash|blade\b|तरबार)/i },
  { tag: 'magic', re: /\b(magic|spell\b|enchant|portal\b|whoosh mystic)/i },
  { tag: 'cave_echo', re: /\b(cave\b|echo in hall|underground tunnel)/i },
  { tag: 'heartbeat', re: /\b(heartbeat|heart pounding|धड्कन)/i },
  { tag: 'whisper', re: /\b(whisper|murmur\b|कानमा फुसफुस)/i },
  { tag: 'scream', re: /\b(scream|shriek|चिच्याउँदै)/i },
  { tag: 'paper', re: /\b(paper rustle|letter unfolded|scroll\b)/i }
]

const DEFAULT_SFX_GAIN = {
  thunder: 0.09,
  scream: 0.065,
  heartbeat: 0.055,
  sword: 0.06,
  crowd: 0.045,
  city: 0.04,
  whisper: 0.05,
  magic: 0.055,
  default: 0.072
}

/**
 * @param {Array<{ narration?: string, visual_description?: string }>} scriptRows
 */
export function inferSfxCues(scriptRows, secondsPerScene, maxCues = 8) {
  const cues = []
  let budget = maxCues
  const seenSceneTags = new Set()

  for (let i = 0; i < scriptRows.length && budget > 0; i++) {
    const row = scriptRows[i] || {}
    const blob = `${row.narration || ''} ${row.visual_description || ''}`
    for (const { tag, re } of SFX_RULES) {
      if (!re.test(blob)) continue
      const url = SFX_BY_TAG[tag]
      if (!url) continue
      const key = `${i}:${tag}`
      if (seenSceneTags.has(key)) continue
      seenSceneTags.add(key)
      cues.push({
        sceneIndex: i + 1,
        startSec: Math.round((i * secondsPerScene + 0.28) * 1000) / 1000,
        url,
        gain: DEFAULT_SFX_GAIN[tag] ?? DEFAULT_SFX_GAIN.default,
        tag
      })
      budget--
      break
    }
  }
  return cues
}

/**
 * Serializable mix recipe for the render worker (ducking + optional segmented beds + SFX).
 */
export function buildStoryAudioPlan({
  genre,
  theme,
  storyTone,
  seedLine,
  setting,
  country,
  script,
  secondsPerScene = DEFAULT_SECONDS_PER_SCENE,
  overrides = {}
}) {
  const rows = Array.isArray(script) ? script : []
  const n = rows.length
  const nepali = nepalRegionalContext({ country, theme, seedLine, setting })
  const segments = []

  for (let i = 0; i < n; i++) {
    const row = rows[i] || {}
    const narration = String(row.narration || '')
    const visual = String(row.visual_description || '')
    const phase = inferNarrativePhase(i, n, narration, visual, storyTone)
    const bedUrl = pickBedForGenrePhase({
      genre,
      theme,
      tone: storyTone,
      seedLine,
      setting,
      phase,
      nepaliBoost: nepali
    })
    segments.push({
      sceneIndex: i + 1,
      durationSec: secondsPerScene,
      bedUrl,
      phase,
      intensity: phaseIntensity(phase)
    })
  }

  const sfxCues = inferSfxCues(rows, secondsPerScene, overrides.maxSfxCues ?? 8)

  return {
    version: 1,
    secondsPerScene,
    musicEnabled: overrides.musicEnabled !== false,
    sfxEnabled: overrides.sfxEnabled !== false,
    autoMix: overrides.autoMix !== false,
    musicGain: typeof overrides.musicGain === 'number' ? overrides.musicGain : 0.22,
    sfxGain: typeof overrides.sfxGain === 'number' ? overrides.sfxGain : 0.085,
    narratorGain: 1,
    nepaliRegionalBoost: nepali,
    segments,
    sfxCues,
    genre: String(genre || ''),
    theme: String(theme || ''),
    storyTone: storyTone ? String(storyTone) : ''
  }
}
