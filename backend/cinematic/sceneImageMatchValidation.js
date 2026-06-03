/**
 * Post-generation scene image matching — scored style, cast, environment, story beat.
 */

import { validateSceneImage, validationFailureReason } from './sceneImageValidation.js'

const STYLE_MARKERS = {
  soft_anime_fantasy: /\b(anime|cel|illustration|manga)\b/i,
  cozy_storybook: /\b(storybook|hand-?drawn|whimsical|watercolor|illustrated)\b/i,
  cinematic_anime: /\b(cinematic|concept art|film|dramatic lighting)\b/i,
  comic_panel: /\b(comic|graphic novel|inked|panel)\b/i,
  cinematic_realistic: /\b(realistic|photograph|photoreal|natural light)\b/i,
  custom: /\b(style lock|custom)\b/i
}

const MATCH_THRESHOLD = Number(process.env.KATHA_IMAGE_MATCH_MIN_SCORE || 68)

function styleKeyBase(key = '') {
  return String(key).split('+')[0].trim()
}

function promptMentionsStyle(prompt, styleKey) {
  const base = styleKeyBase(styleKey)
  const re = STYLE_MARKERS[base]
  if (!re) return true
  return re.test(String(prompt || ''))
}

function environmentOverlap(sceneRow, prompt) {
  const env = String(
    sceneRow?.environment || sceneRow?.location || sceneRow?.__sceneVisualBrief || ''
  ).toLowerCase()
  const p = String(prompt || '').toLowerCase()
  if (!env.trim()) return 0.75
  const tokens = env.split(/\W+/).filter((w) => w.length > 4).slice(0, 6)
  if (!tokens.length) return 0.75
  const hits = tokens.filter((t) => p.includes(t))
  return hits.length / Math.max(1, Math.min(3, tokens.length))
}

function sceneBeatOverlap(sceneRow, prompt) {
  const beat = String(
    sceneRow?.action || sceneRow?.__sceneVisualBrief || sceneRow?.visual_description || ''
  ).toLowerCase()
  const p = String(prompt || '').toLowerCase()
  if (beat.length < 20) return 0.7
  const verbs =
    beat.match(/\b(runs|walks|stands|looks|holds|opens|closes|cries|smiles|turns|reaches|whispers|kneels|enters|leaves)\w*/g) ||
    []
  if (verbs.length) {
    return verbs.some((v) => p.includes(v.split(/\s/)[0])) ? 1 : 0.35
  }
  const words = beat.split(/\W+/).filter((w) => w.length > 5).slice(0, 5)
  if (!words.length) return 0.6
  const hits = words.filter((w) => p.includes(w))
  return hits.length / words.length
}

function emotionOverlap(sceneRow, prompt) {
  const emotion = String(sceneRow.emotional_tone || sceneRow.mood || '').toLowerCase()
  const p = String(prompt || '').toLowerCase()
  if (!emotion || emotion.length < 3) return 0.7
  const token = emotion.split(/\s/)[0]
  if (p.includes(token)) return 1
  if (/\b(tense|joy|fear|grief|hope|anger|calm|warm)\b/.test(p)) return 0.75
  return 0.45
}

function characterMatchScore(cast, scriptRow, prompt) {
  if (!cast?.length) return 0.8
  const visual = String(
    scriptRow?.__sceneVisualBrief || scriptRow?.visual_description || scriptRow?.action || ''
  ).toLowerCase()
  const p = String(prompt || '').toLowerCase()
  let hits = 0
  for (const m of cast) {
    const label = String(m.label || '').toLowerCase().trim()
    if (label.length > 3 && (visual.includes(label) || p.includes(label))) hits += 1
  }
  const ratio = hits / Math.max(1, cast.length)
  const envOnly =
    /\b(landscape|empty|scenery only|no (people|characters)|establishing shot only)\b/i.test(p) &&
    !/\b(cast|character|portrait|face|figure)\b/i.test(p)
  if (envOnly) return Math.min(ratio, 0.25)
  return ratio
}

/**
 * @param {object} opts
 */
export function scoreSceneImageMatch(opts = {}) {
  const row = opts.scriptRow || {}
  const prompt = String(opts.prompt || '')
  const styleKey = opts.styleKey || ''
  const cast = opts.castMemory || []

  const characterMatch = Math.round(characterMatchScore(cast, row, prompt) * 100)
  const storyMatch = Math.round(sceneBeatOverlap(row, prompt) * 100)
  const styleMatch = promptMentionsStyle(prompt, styleKey) ? 95 : 40
  const emotionMatch = Math.round(emotionOverlap(row, prompt) * 100)
  const environmentScore = Math.round(environmentOverlap(row, prompt) * 100)

  const composite = Math.round(
    storyMatch * 0.35 + characterMatch * 0.3 + styleMatch * 0.15 + emotionMatch * 0.12 + environmentScore * 0.08
  )

  return {
    characterMatch,
    storyMatch,
    styleMatch,
    emotionMatch,
    environmentScore,
    composite
  }
}

/**
 * @param {object} opts
 */
export function validateSceneImageMatch(opts = {}) {
  const base = validateSceneImage(opts)
  const issues = [...(base.issues || [])]
  const row = opts.scriptRow || {}
  const prompt = String(opts.prompt || '')
  const styleKey = opts.styleKey || ''

  const scores = scoreSceneImageMatch(opts)

  if (!promptMentionsStyle(prompt, styleKey)) {
    issues.push('style_not_in_prompt')
  }
  if (scores.storyMatch < 45) {
    issues.push('scene_event_mismatch')
  }
  if (scores.characterMatch < 35) {
    issues.push('character_alignment_low')
  }
  if (scores.environmentScore > 85 && scores.storyMatch < 50 && scores.characterMatch < 40) {
    issues.push('environment_only_risk')
  }
  if (scores.emotionMatch < 40) {
    issues.push('emotion_weak_in_prompt')
  }

  const hardFail = issues.some((i) =>
    [
      'missing_image_url',
      'prompt_text_leak',
      'character_alignment_low',
      'scene_description_too_short',
      'scene_description_title_only',
      'style_not_in_prompt',
      'scene_event_mismatch',
      'environment_only_risk'
    ].includes(i)
  )

  const belowThreshold = scores.composite < MATCH_THRESHOLD

  return {
    ...base,
    ok: issues.length === 0 && !belowThreshold,
    issues,
    scores,
    matchThreshold: MATCH_THRESHOLD,
    shouldRegenerate: hardFail || belowThreshold || base.shouldRegenerate,
    failureReason: validationFailureReason({ issues: [...issues, ...(belowThreshold ? ['match_score_low'] : [])] })
  }
}
