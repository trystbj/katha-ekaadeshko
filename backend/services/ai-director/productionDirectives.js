/**
 * Structured production directives — master contract for all generation stages.
 */

export const EMPTY_PRODUCTION_DIRECTIVES = {
  genre: '',
  emotion: '',
  pacing: '',
  visualStyle: '',
  cameraStyle: '',
  dialogueStyle: '',
  animationStyle: '',
  targetPlatform: '',
  narrationTone: '',
  lightingStyle: '',
  motionIntensity: '',
  sceneMood: ''
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {typeof EMPTY_PRODUCTION_DIRECTIVES & { generationMode?: string, directorNotes?: string }}
 */
export function normalizeProductionDirectives(raw = {}) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const out = { ...EMPTY_PRODUCTION_DIRECTIVES }
  for (const k of Object.keys(EMPTY_PRODUCTION_DIRECTIVES)) {
    const v = src[k]
    out[k] = typeof v === 'string' ? v.trim().slice(0, 280) : ''
  }
  const mode = String(src.generationMode || src.mode || '').toLowerCase()
  out.generationMode = mode === 'fast' ? 'fast' : 'cinematic'
  const notes = String(src.directorNotes || src.summary || '').trim()
  if (notes) out.directorNotes = notes.slice(0, 600)
  return out
}

/**
 * @param {object} input pipeline input
 * @param {object} [overrides]
 */
export function buildHeuristicDirectives(input = {}, overrides = {}) {
  const genre = String(input.genre || '').trim()
  const theme = String(input.theme || '').trim()
  const tone = String(input.storyTone || input.tone || '').trim()
  const seed = String(input.seedLine || '').trim()
  const styleId = String(input.styleId || '').trim()
  const aspect = String(input.aspectMode || 'vertical_9_16')
  const blob = `${genre} ${theme} ${tone} ${seed}`.toLowerCase()

  let emotion = tone || 'hopeful_drama'
  if (/\b(horror|fear|dark|terror)\b/i.test(blob)) emotion = 'tension_dread'
  else if (/\b(romance|love|heart)\b/i.test(blob)) emotion = 'warm_intimate'
  else if (/\b(comedy|funny|humor)\b/i.test(blob)) emotion = 'light_playful'
  else if (/\b(action|battle|chase)\b/i.test(blob)) emotion = 'kinetic_urgency'

  let pacing = 'balanced_episodic'
  if (/\b(fast|quick|shorts|tiktok)\b/i.test(blob)) pacing = 'snappy_shortform'
  else if (/\b(slow|meditative|poetic)\b/i.test(blob)) pacing = 'contemplative'
  else if (input.length && /short/i.test(String(input.length))) pacing = 'snappy_shortform'

  const visualStyle =
    styleId === 'cinematic_anime'
      ? 'cinematic_anime_filmic'
      : styleId === 'dark_anime'
        ? 'noir_anime_contrast'
        : styleId === 'cozy_storybook'
          ? 'soft_storybook_warmth'
          : styleId === 'comic_panel'
            ? 'graphic_panel_bold'
            : 'studio_locked_visual'

  const cameraStyle = /\b(close|intimate|portrait)\b/i.test(blob)
    ? 'close_emotional_coverage'
    : /\b(epic|wide|landscape)\b/i.test(blob)
      ? 'wide_establishing_cinematic'
      : 'motivated_medium_coverage'

  const animationStyle =
    input.performancePreferLow || input.generationMode === 'fast'
      ? 'subtle_parallax_fast'
      : 'cinematic_motion_emotive'

  const targetPlatform =
    aspect === 'horizontal_16_9'
      ? 'youtube_landscape'
      : /\b(shorts|reel|tiktok|vertical)\b/i.test(blob)
        ? 'shorts_vertical'
        : 'mobile_vertical_story'

  const motionIntensity =
    animationStyle === 'subtle_parallax_fast' ? 'low' : emotion.includes('kinetic') ? 'high' : 'medium'

  const lightingStyle = /\b(night|moon|dark)\b/i.test(blob)
    ? 'low_key_moonlit'
    : /\b(sun|day|bright)\b/i.test(blob)
      ? 'natural_daylight'
      : 'motivated_cinematic'

  return normalizeProductionDirectives({
    genre: genre || 'drama',
    emotion,
    pacing,
    visualStyle,
    cameraStyle,
    dialogueStyle: 'natural_culturally_grounded',
    animationStyle,
    targetPlatform,
    narrationTone: tone || 'warm_cinematic_narrator',
    lightingStyle,
    motionIntensity,
    sceneMood: emotion,
    generationMode: input.generationMode || (input.performancePreferLow ? 'fast' : 'cinematic'),
    ...overrides
  })
}

/**
 * Inject into LLM prompts (story, script, Leonardo).
 * @param {ReturnType<typeof normalizeProductionDirectives>} directives
 */
export function productionDirectivesPromptBlock(directives) {
  const d = normalizeProductionDirectives(directives)
  const lines = Object.entries(EMPTY_PRODUCTION_DIRECTIVES)
    .map(([k, _]) => `- ${k}: ${d[k] || '(infer from blueprint)'}`)
    .join('\n')
  const mode = d.generationMode === 'fast' ? 'FAST (efficient motion, simpler shots)' : 'CINEMATIC (emotional timing, rich camera)'
  return `=== AI PRODUCTION DIRECTIVES (${mode}) ===
Behave as an intelligent cinematic director — not prompt completion.
Honor these locks across story, dialogue, visuals, and motion:
${lines}
${d.directorNotes ? `Director notes: ${d.directorNotes}\n` : ''}=== END PRODUCTION DIRECTIVES ===`
}
