/**
 * Strict visual style locking for Leonardo + script prompts.
 * Mirrors studio style IDs in `src/renderer/src/types/story.ts` (UI unchanged).
 */

import { imagePromptEnglishLockLine } from '../../shared/outputLanguageLock.js'

const STORYBOOK_HINT =
  /\b(storybook|hand-?drawn|cozy\s+cartoon|watercolor\s+wash|children'?s\s+book|folktale\s+illustration)\b/i

const HYBRID_HINT =
  /\b(blend(ing)?\s+styles|style\s+blend|hybrid\s+(style|look|aesthetic)|mixed\s+media\s+art|combine\s+realistic\s+and|mix\s+anime\s+and\s+live|photoreal\s*\+\s*cartoon)\b/i

/** Base DNA presets — Leonardo + script use different facets of the same profile. */
export const STYLE_DNA = {
  soft_anime_fantasy: {
    shortLabel: 'soft anime illustration',
    storyHint:
      'soft anime storytelling — warm colors, emotional expressions, gentle lighting, cozy fantasy atmosphere; one anime dialect only',
    leonardoCore:
      'STYLE LOCK — soft anime illustration ONLY: warm colors, emotional anime expressions, gentle lighting, detailed anime backgrounds, cinematic anime composition, clean anime character design, cozy fantasy atmosphere, high-quality anime storytelling visuals, consistent cast likeness',
    leonardoForbidden:
      'FORBIDDEN unless hybrid mode: photoreal DSLR skin, harsh HDR, western 3D CGI, flat corporate vector, gritty horror grime, unrelated storybook watercolor as dominant finish',
    scriptGuidance:
      'Every shot stays soft anime: warm palette, gentle light, clean character design, emotional faces, detailed backgrounds — never mix photoreal or unrelated mediums.'
  },
  cozy_storybook: {
    shortLabel: 'cozy hand-drawn storybook illustration',
    storyHint:
      'cozy storybook — whimsical hand-drawn worlds, warm lighting, charming details, peaceful nature; single storybook dialect',
    leonardoCore:
      'STYLE LOCK — cozy hand-drawn storybook illustration ONLY: cozy environments, whimsical atmosphere, storybook character design, warm lighting, charming details, children\'s book quality artwork, peaceful nature elements, soft illustrated textures, consistent character likeness',
    leonardoForbidden:
      'FORBIDDEN unless hybrid mode: photoreal actors, harsh noir contrast, glossy 3D CGI, hyper-polished anime blockbuster look',
    scriptGuidance:
      'Describe cozy storybook beats — hand-drawn warmth, whimsical staging, nature charm — avoid photoreal or unrelated anime/CGI finishes.'
  },
  cinematic_anime: {
    shortLabel: 'cinematic concept art',
    storyHint:
      'cinematic film visuals — movie-like composition, dramatic lighting, emotional storytelling, professional scene design; one cinematic dialect',
    leonardoCore:
      'STYLE LOCK — cinematic concept art ONLY: movie-like composition, dramatic lighting, realistic depth, wide environmental shots, cinematic framing, emotional storytelling visuals, high-detail environments, professional film-quality scene design, consistent character identity',
    leonardoForbidden:
      'FORBIDDEN unless hybrid mode: flat sticker cartoon, random anime chibi, unrelated watercolor storybook as dominant finish, split-panel collage',
    scriptGuidance:
      'Describe cinematic film beats — motivated lighting, depth, wide/medium/close framing by emotion — keep one professional cinematic look; no contradictory flat cartoon or unrelated mediums.'
  },
  comic_panel: {
    shortLabel: 'comic book illustration',
    storyHint:
      'comic / graphic novel — bold outlines, dynamic poses, stylized environments; artwork ONLY (Katha renders dialogue as overlays)',
    leonardoCore:
      'STYLE LOCK — comic book illustration ONLY: graphic novel quality, bold outlines, expressive characters, comic-style rendering, dynamic poses, stylized environments, professional comic artwork, consistent character likeness, clean panel composition, cinematic comic framing — NO speech bubbles, NO captions, NO readable text, NO dialogue balloons in frame',
    leonardoForbidden:
      'FORBIDDEN: speech bubbles, speech balloons, captions, narration boxes, readable letters, words in frame, subtitle text, comic dialogue text, cluttered multi-panel grids with text; unless hybrid mode: soft watercolor anime wash, hyperreal photographic pores, unrelated painterly oil realism as dominant finish',
    scriptGuidance:
      'Storyboard comic beats — inked contours, bold lines, dynamic poses, emotion-focused shots. visual_description must describe artwork ONLY — Katha renders speech bubbles and captions separately. Never ask the image model to draw readable dialogue.'
  },
  cinematic_realistic: {
    shortLabel: 'realistic cinematic photography',
    storyHint:
      'realistic visual storytelling — natural lighting, believable anatomy, photographic quality; single photoreal dialect',
    leonardoCore:
      'STYLE LOCK — realistic cinematic photography ONLY: realistic characters, realistic environments, natural lighting, realistic materials, photographic quality, believable anatomy, real-world textures, realistic cinematic composition, high-resolution visual storytelling, consistent hairstyle clothing and facial identity',
    leonardoForbidden:
      'FORBIDDEN unless hybrid mode: anime cel shading, flat cartoon, sticker emoji art, exaggerated toon proportions, unrelated watercolor impressionism as dominant finish',
    scriptGuidance:
      'Describe photoreal beats — natural light, believable materials, identity-locked wardrobe and faces — no illustrated-anime or flat cartoon language.'
  },
}

/** Single-line strict style enforcement for Leonardo (no mixed mediums). */
export function strictStylePromptLine(profile) {
  if (!profile) return ''
  const hybrid = profile.key?.includes('+')
  const core = String(profile.leonardoCore || '').trim()
  const forbid = hybrid
    ? 'Hybrid allowed only when user requested — still one cohesive frame.'
    : String(profile.leonardoForbidden || '')
        .replace(/^FORBIDDEN[^:]*:\s*/i, '')
        .trim()
  return `${core}${forbid ? ` FORBIDDEN: ${forbid}` : ''}`.slice(0, 320)
}

export function detectStyleHybridRequested(input = {}) {
  const blob = [input.customVisualPrompt, input.theme, input.seedLine, input.visualAccent]
    .filter(Boolean)
    .join(' ')
  return HYBRID_HINT.test(blob)
}

/** Mood keywords → secondary style dialect for hybrid blending. */
function inferSecondaryStyleKey(blob) {
  if (/\b(horror|dark|noir|dread|photoreal|documentary|realistic)\b/i.test(blob)) return 'cinematic_realistic'
  if (/\b(storybook|watercolor|cozy|folk)\b/i.test(blob)) return 'cozy_storybook'
  if (/\b(comic|panel|ink)\b/i.test(blob)) return 'comic_panel'
  if (/\b(cinematic anime|anime film)\b/i.test(blob)) return 'cinematic_anime'
  return 'soft_anime_fantasy'
}

/**
 * @param {object} input
 * @returns {{ primary: string, secondary: string | null, weights: { primary: number, secondary: number } | null }}
 */
export function resolveStyleBlendWeights(input = {}) {
  const hybrid = detectStyleHybridRequested(input)
  const primary = input.styleId && input.styleId !== 'custom' ? input.styleId : 'soft_anime_fantasy'
  if (!hybrid) return { primary, secondary: null, weights: null }
  const blob = [input.customVisualPrompt, input.theme, input.seedLine].filter(Boolean).join(' ')
  const secondary = inferSecondaryStyleKey(blob)
  return { primary, secondary, weights: { primary: 0.62, secondary: 0.38 } }
}

/**
 * @returns {{ key: string, shortLabel: string, storyHint: string, leonardoCore: string, leonardoForbidden: string, scriptGuidance: string }}
 */
export function resolveStyleProfile(input = {}) {
  const hybrid = detectStyleHybridRequested(input)
  let styleId = input.styleId || 'soft_anime_fantasy'

  if (styleId === 'custom') {
    const raw = String(input.customVisualPrompt || '').trim()
    if (raw && STORYBOOK_HINT.test(raw)) {
      const base = STYLE_DNA.cozy_storybook
      return {
        key: 'cozy_storybook+custom',
        shortLabel: base.shortLabel,
        storyHint: `${base.storyHint}; artist notes: ${raw.slice(0, 220)}`,
        leonardoCore: `${base.leonardoCore}. Artist-locked refinements: ${raw.slice(0, 900)}`,
        leonardoForbidden: hybrid ? `${base.leonardoForbidden} (hybrid cues allowed when explicitly requested)` : base.leonardoForbidden,
        scriptGuidance: `${base.scriptGuidance} Apply artist refinements consistently: ${raw.slice(0, 400)}`
      }
    }
    if (!raw) {
      const fb = STYLE_DNA.soft_anime_fantasy
      return { key: 'custom_fallback_soft', ...fb }
    }
    return {
      key: 'custom',
      shortLabel: `custom locked direction (${raw.slice(0, 80)}${raw.length > 80 ? '…' : ''})`,
      storyHint: `single cohesive illustrated look exactly matching user keywords — ${raw.slice(0, 260)}`,
      leonardoCore: `STYLE LOCK — custom illustrated direction ONLY. Render as ONE unified medium exactly guided by: ${raw.slice(0, 920)}. Every pixel must obey these keywords; expand tastefully without swapping render families.`,
      leonardoForbidden: hybrid
        ? 'Mix additional aesthetics ONLY when user cues explicitly demand hybrid fusion.'
        : 'FORBIDDEN: drifting into default anime, photorealism, or unrelated mainstream styles not named above.',
      scriptGuidance: `Every scene description must stay inside this locked art direction verbatim spirit: ${raw.slice(0, 520)}`
    }
  }

  const preset = STYLE_DNA[styleId]
  if (!preset) {
    const fb = STYLE_DNA.soft_anime_fantasy
    return { key: 'unknown_default_soft', ...fb }
  }

  const blend = resolveStyleBlendWeights(input)
  if (blend.weights) {
    const sec = STYLE_DNA[blend.secondary]
    return {
      key: `${styleId}+${blend.secondary}`,
      ...preset,
      storyHint: `${preset.storyHint} — intelligent blend (${Math.round(blend.weights.primary * 100)}% ${preset.shortLabel} / ${Math.round(blend.weights.secondary * 100)}% ${sec?.shortLabel || blend.secondary}).`,
      scriptGuidance: `${preset.scriptGuidance} Secondary mood layer (${blend.secondary}): ${sec?.scriptGuidance?.slice(0, 200) || 'cohesive fusion only.'}`
    }
  }
  return { key: styleId, ...preset }
}

export function buildStoryStyleHintLine(input = {}) {
  const profile = resolveStyleProfile(input)
  const hybrid = detectStyleHybridRequested(input)
  if (hybrid) return `${profile.storyHint} — HYBRID MODE: user explicitly requested blending; fuse aesthetics deliberately yet keep readable cohesion.`
  return `${profile.storyHint} — STRICT SINGLE STYLE: do not narrate contradictory rendering mediums.`
}

export function buildScriptVisualStyleSection(input = {}) {
  const profile = resolveStyleProfile(input)
  const hybrid = detectStyleHybridRequested(input)
  if (hybrid) {
    return `
VISUAL STYLE — HYBRID / BLEND MODE:
- User explicitly requested mixing aesthetics — you may combine influences deliberately while staying visually coherent.
- ${profile.scriptGuidance}
- Still avoid random unrelated jumps (e.g., photoreal actors beside unrelated sticker emoji art) unless clearly intentional.
`
  }
  return `
VISUAL STYLE — STRICT LOCK (NON-NEGOTIABLE):
- ${profile.scriptGuidance}
- Every scene's visual_description must obey the SAME illustrated medium, lighting grammar, texture language, and camera culture as scene 1.
- Do NOT instruct contradictory renders (no photoreal documentary + ink comic + watercolor anime in one story unless HYBRID MODE text above applies).
- Keep character silhouettes, costume rendering, and background brush/line language consistent shot-to-shot.
`
}

/**
 * Leonardo scene prompt — style-first to reduce cross-contamination from genre/theme tokens.
 */
function sceneVisualCues(scene = {}) {
  const visual = String(scene.visual_description || '').trim()
  const mood = String(scene.mood || scene.emotional_tone || '').trim()
  const chars = Array.isArray(scene.characters_in_shot)
    ? scene.characters_in_shot.map((c) => String(c).trim()).filter(Boolean).join(', ')
    : ''
  const action = String(scene.action || '').trim()
  const env = String(scene.environment || scene.location || '').trim()
  const time = String(scene.time_of_day || '').trim()
  const weather = String(scene.weather || '').trim()
  const camera = String(scene.camera || scene.camera_angle || '').trim()
  const lighting = String(scene.lighting || '').trim()
  return [
    visual ? `Staging: ${visual}` : '',
    chars ? `Characters in frame: ${chars}` : '',
    action ? `Action: ${action}` : '',
    env ? `Environment: ${env}` : '',
    time ? `Time: ${time}` : '',
    weather ? `Weather: ${weather}` : '',
    lighting ? `Lighting: ${lighting}` : '',
    camera ? `Camera: ${camera}` : '',
    mood ? `Emotion/mood: ${mood}` : '',
    'Same exact characters from previous scenes — identical faces, hair, wardrobe, and proportions.'
  ]
    .filter(Boolean)
    .join(' ')
}

export function buildLeonardoScenePrompt(scene, input = {}, identityBlock = '') {
  const vertical = input.aspectMode !== 'horizontal_16_9'
  const framing = vertical
    ? 'vertical 9:16 portrait composition, tall readable framing, hero readability'
    : 'horizontal 16:9 widescreen composition, cinematic letter-safe framing'

  const hybrid = detectStyleHybridRequested(input)
  const profile = resolveStyleProfile(input)

  let core = hybrid
    ? `${profile.leonardoCore} HYBRID MODE ACTIVE — blend aesthetics deliberately per user cues while preserving cohesion.`
    : `${profile.leonardoCore} ${profile.leonardoForbidden}`

  const accent = String(input.visualAccent || '').trim()
  let accentLine = ''
  if (accent) {
    accentLine = hybrid
      ? `Layered mood / palette cues: ${accent.slice(0, 320)}`
      : `Ambient mood accent ONLY (preserve locked rendering medium — no medium swap): ${accent.slice(0, 320)}`
  }

  const genre = String(input.genre || '').slice(0, 120)
  const themeCue = String(input.theme || '').slice(0, 240)
  const sceneNum = Number(scene.scene)
  const sceneCue = sceneVisualCues(scene)
  const crefBlock = String(input.__characterReferencePrompt || '').trim()

  const storyPurpose = String(scene.scene_purpose || scene.narrative_context || '').trim()
  const bodyLang = String(scene.body_language || scene.action || '').trim()

  return [
    imagePromptEnglishLockLine(),
    core,
    identityBlock ? String(identityBlock).trim() : '',
    crefBlock,
    `Story genre mood (do not override locked medium): ${genre}. Context: ${themeCue}`,
    Number.isFinite(sceneNum) ? `Scene ${sceneNum} — illustrate ONLY this beat; no unrelated locations or cast swaps.` : '',
    framing,
    sceneCue || `Scene action & staging: ${scene.visual_description || 'cinematic story beat'}`,
    storyPurpose ? `Narrative purpose: ${storyPurpose}.` : '',
    bodyLang ? `Body language: ${bodyLang}.` : '',
    'Camera direction: motivated shot scale (wide / medium / close-up) chosen for emotional storytelling.',
    'Lighting: motivated cinematic light — sunlight, moonlight, ambient, or dramatic volumetric as scene requires.',
    'Series continuity: identical universe, persistent costume colors, consistent facial likeness, unified medium.',
    'Quality: highly detailed, professional artwork, consistent character design, high-quality visual storytelling.',
    'No readable text, captions, logos, or watermarks.',
    accentLine
  ]
    .filter(Boolean)
    .join(' ')
}
