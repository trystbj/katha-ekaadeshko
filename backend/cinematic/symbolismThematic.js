/**
 * Symbolism & thematic storytelling — motifs, color tone, lighting symbols.
 */

const THEME_PATTERNS = [
  ['loneliness', /\b(alone|lonely|isolated|empty room|no one)\b/i],
  ['sacrifice', /\b(sacrifice|gave up|for your sake|martyr)\b/i],
  ['revenge', /\b(revenge|vengeance|payback|avenge)\b/i],
  ['hope', /\b(hope|dawn|light at|believe|tomorrow)\b/i],
  ['destiny', /\b(destiny|fate|prophecy|chosen)\b/i],
  ['corruption', /\b(corrupt|rot|decay|tainted|darkness spread)\b/i],
  ['grief', /\b(grief|mourning|grave|funeral|never forget)\b/i],
  ['redemption', /\b(redemption|forgive|atone|second chance)\b/i],
  ['obsession', /\b(obsess|cannot stop|haunted by|fixated)\b/i],
  ['survival', /\b(survive|last one|hunger|escape|endure)\b/i]
]

/**
 * @param {ReturnType<import('./sceneContext.js').analyzeSceneContext>} ctx
 * @param {string} blob narration+visual
 * @param {number} sceneIndex
 * @param {number} sceneCount
 */
export function inferSymbolismCue(ctx, blob, sceneIndex, sceneCount) {
  const themes = []
  for (const [tag, re] of THEME_PATTERNS) {
    if (re.test(blob)) themes.push(tag)
  }
  if (!themes.length) themes.push('neutral')

  const progress = sceneCount > 1 ? sceneIndex / (sceneCount - 1) : 0
  let colorTone = 'vivid'
  let lightingSymbol = 'balanced light'

  if (themes.includes('loneliness')) {
    colorTone = 'cool'
    lightingSymbol = 'isolated rim light, negative space'
  }
  if (themes.includes('hope')) {
    colorTone = progress > 0.4 ? 'warm' : 'desaturated'
    lightingSymbol = 'warming key light progression'
  }
  if (themes.includes('corruption') || themes.includes('grief')) {
    colorTone = 'desaturated'
    lightingSymbol = 'falling shadows, muted highlights'
  }
  if (themes.includes('revenge') || themes.includes('obsession')) {
    colorTone = 'cool'
    lightingSymbol = 'harsh contrast, sharp edges'
  }
  if (ctx.emotion === 'wonder' || themes.includes('destiny')) {
    lightingSymbol = 'ethereal backlight, motif glow'
  }

  const motifs = []
  if (/\b(mirror|reflection)\b/i.test(blob)) motifs.push('mirror_duality')
  if (/\b(door|threshold|gate)\b/i.test(blob)) motifs.push('threshold_crossing')
  if (/\b(rain|storm)\b/i.test(blob)) motifs.push('cleansing_or_burden')
  if (/\b(fire|flame|candle)\b/i.test(blob)) motifs.push('fragile_light')
  if (/\b(bird|flight|sky)\b/i.test(blob)) motifs.push('freedom_or_loss')

  const recurringImagery = motifs.slice(0, 4)
  if (themes[0] !== 'neutral') recurringImagery.push(`theme_${themes[0]}`)

  return {
    themes: themes.slice(0, 4),
    motifs: motifs.slice(0, 6),
    colorTone,
    lightingSymbol,
    recurringImagery: recurringImagery.slice(0, 5)
  }
}

/** Apply symbolism to environment/composition lightly. */
export function applySymbolismToScene(scene, symbolism) {
  if (!scene || !symbolism) return scene
  if (scene.environment) {
    if (symbolism.colorTone === 'cool') scene.environment.warmth = Math.max(0, (scene.environment.warmth ?? 0.5) - 0.12)
    if (symbolism.colorTone === 'warm') scene.environment.warmth = Math.min(1, (scene.environment.warmth ?? 0.5) + 0.12)
    if (symbolism.themes?.includes('loneliness')) {
      scene.composition = scene.composition || {}
      scene.composition.subjectPlacement = 'left_third'
      scene.composition.foregroundWeight = Math.min(1, (scene.composition.foregroundWeight ?? 0.5) + 0.1)
    }
  }
  return scene
}
