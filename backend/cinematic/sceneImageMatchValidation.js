/**
 * Post-generation scene image matching — style, cast, environment, story beat.
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
    sceneRow?.environment || sceneRow?.location || sceneRow?.visual_description || ''
  ).toLowerCase()
  const p = String(prompt || '').toLowerCase()
  if (!env.trim()) return true
  const tokens = env.split(/\W+/).filter((w) => w.length > 4).slice(0, 6)
  if (!tokens.length) return true
  const hits = tokens.filter((t) => p.includes(t))
  return hits.length >= Math.min(2, tokens.length)
}

function sceneBeatOverlap(sceneRow, prompt) {
  const beat = String(sceneRow?.visual_description || sceneRow?.action || '').toLowerCase()
  const p = String(prompt || '').toLowerCase()
  if (beat.length < 30) return true
  const verbs = beat.match(/\b(runs|walks|stands|looks|holds|opens|closes|cries|smiles|turns|reaches|whispers|kneels|enters|leaves)\w*/g) || []
  if (!verbs.length) {
    const words = beat.split(/\W+/).filter((w) => w.length > 5).slice(0, 5)
    return words.some((w) => p.includes(w))
  }
  return verbs.some((v) => p.includes(v.split(/\s/)[0]))
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

  if (styleKey && !promptMentionsStyle(prompt, styleKey)) {
    issues.push('style_not_in_prompt')
  }
  if (!environmentOverlap(row, prompt)) {
    issues.push('environment_mismatch')
  }
  if (!sceneBeatOverlap(row, prompt)) {
    issues.push('scene_event_mismatch')
  }

  const emotion = String(row.emotional_tone || row.mood || '').toLowerCase()
  if (emotion && emotion.length > 3 && !prompt.toLowerCase().includes(emotion.split(/\s/)[0])) {
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
      'environment_mismatch',
      'scene_event_mismatch'
    ].includes(i)
  )

  return {
    ...base,
    ok: issues.length === 0,
    issues,
    shouldRegenerate: hardFail || base.shouldRegenerate,
    failureReason: validationFailureReason({ issues })
  }
}
