/**
 * Strict visual style locking for Leonardo + script prompts.
 * Mirrors studio style IDs in `src/renderer/src/types/story.ts` (UI unchanged).
 */

const STORYBOOK_HINT =
  /\b(storybook|hand-?drawn|cozy\s+cartoon|watercolor\s+wash|children'?s\s+book|folktale\s+illustration)\b/i

const HYBRID_HINT =
  /\b(blend(ing)?\s+styles|style\s+blend|hybrid\s+(style|look|aesthetic)|mixed\s+media\s+art|combine\s+realistic\s+and|mix\s+anime\s+and\s+live|photoreal\s*\+\s*cartoon)\b/i

/** Base DNA presets — Leonardo + script use different facets of the same profile. */
export const STYLE_DNA = {
  soft_anime_fantasy: {
    shortLabel: 'painterly cinematic fantasy illustration',
    storyHint:
      'cozy emotional fantasy — warm cinematic light, dreamlike Nepal-inspired scenery, slow emotional pacing; one cohesive painterly look',
    leonardoCore:
      'STYLE LOCK — painterly cinematic fantasy ONLY: cozy emotional lighting, warm cinematic atmosphere, soft glowing environments, dreamy diffused light, elegant painterly textures, rich fantasy composition, emotional depth, lush Nepal-inspired nature backdrops',
    leonardoForbidden:
      'FORBIDDEN unless hybrid mode: photoreal DSLR skin, harsh HDR, western 3D CGI, flat corporate vector, gritty horror grime',
    scriptGuidance:
      'Every shot must read as the same cozy cinematic fantasy painting: warm light, soft contours, emotional ambience, consistent costume rendering.'
  },
  cozy_storybook: {
    shortLabel: 'cozy hand-drawn storybook animation',
    storyHint:
      'cozy storybook animation — calm expressive motion, soft nature ambience, peaceful pacing; single storybook dialect',
    leonardoCore:
      'STYLE LOCK — cozy storybook animation ONLY: hand-drawn storybook feeling, soft watercolor or gouache washes, friendly expressive faces, simple emotional motion, warm cozy transitions, nature-focused movement, peaceful pacing, readable storybook textures',
    leonardoForbidden:
      'FORBIDDEN unless hybrid mode: photoreal actors, harsh noir contrast, glossy 3D CGI, hyper-detailed cinematic anime unless hybrid requested',
    scriptGuidance:
      'Describe beats like a cozy illustrated storybook — gentle motion, nature ambience, warm friendly staging — avoid contradictory polished blockbuster anime.'
  },
  cinematic_anime: {
    shortLabel: 'cinematic anime cinematography',
    storyHint:
      'dynamic anime cinematography — emotional closeups, strong lighting contrast, dramatic framing; one illustrated medium',
    leonardoCore:
      'STYLE LOCK — cinematic anime ONLY: emotional closeups, strong lighting contrast, dramatic camera framing, anime-inspired cinematic compositions, volumetric light, depth-of-field, rich painted textures, cohesive anime facial anatomy',
    leonardoForbidden:
      'FORBIDDEN unless hybrid mode: pure live-action photorealism, Pixar-style smooth 3D, flat western cartoon, unrelated watercolor impressionism',
    scriptGuidance:
      'Describe anime characters with cinematic lighting grammar — rim light, atmospheric haze, lens-aware framing — never contradict with photoreal documentary language.'
  },
  comic_panel: {
    shortLabel: 'motion comic illustration',
    storyHint:
      'motion comic aesthetic — stylized panels, dynamic transitions, dramatic posing; consistent comic language',
    leonardoCore:
      'STYLE LOCK — motion comic ONLY: stylized panel framing, bold ink outlines, dynamic transitions, dramatic posing, vibrant saturated palette, halftone accents, strong visual storytelling',
    leonardoForbidden:
      'FORBIDDEN unless hybrid mode: soft watercolor anime wash, hyperreal pores, cinematic film grain realism, painterly oil realism',
    scriptGuidance:
      'Storyboard each beat like a polished comic panel — inked contours, dynamic silhouettes, comic color fills — avoid mismatched painterly anime softness.'
  },
  dark_anime: {
    shortLabel: 'atmospheric dark fantasy anime',
    storyHint:
      'dark fantasy anime — intense shadows, fog, mystery and suspense; single anime dialect',
    leonardoCore:
      'STYLE LOCK — dark fantasy anime ONLY: intense shadows and fog, crushed blacks, selective rim highlights, emotional tension, cinematic darkness, dramatic environments, brooding atmosphere',
    leonardoForbidden:
      'FORBIDDEN unless hybrid mode: bright pastel cheer, flat vector corporate art, photoreal actors, cozy storybook softness as dominant finish',
    scriptGuidance:
      'Keep scenes in noir-anime vocabulary — silhouette reads, dramatic backlight, moody environments — no contradictory bright gag-cartoon cues.'
  },
}

export function detectStyleHybridRequested(input = {}) {
  const blob = [input.customVisualPrompt, input.theme, input.seedLine, input.visualAccent]
    .filter(Boolean)
    .join(' ')
  return HYBRID_HINT.test(blob)
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
export function buildLeonardoScenePrompt(scene, input = {}) {
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

  return [
    core,
    `Story genre mood (do not override medium): ${genre}. Context cues: ${themeCue}`,
    framing,
    `Scene action & staging: ${scene.visual_description}`,
    'Series continuity: identical illustrated universe, persistent costume colors, consistent facial likeness hooks, unified shadow softness.',
    'No readable text, captions, logos, or watermarks.',
    accentLine
  ]
    .filter(Boolean)
    .join(' ')
}
