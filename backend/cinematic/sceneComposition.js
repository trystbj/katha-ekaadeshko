/**
 * Scene composition — framing, depth, visual hierarchy.
 */

/**
 * @param {ReturnType<import('./sceneContext.js').analyzeSceneContext>} ctx
 * @param {string} styleId
 */
export function inferSceneComposition(ctx, styleId) {
  let depthLayering = 'medium'
  let subjectPlacement = 'center'
  let foregroundWeight = 0.35
  let lightingFocus = 'balanced'
  let readability = 0.75

  if (ctx.emotion === 'sadness' || ctx.emotion === 'fear') {
    subjectPlacement = 'left_third'
    lightingFocus = 'character'
    depthLayering = 'shallow'
    foregroundWeight = 0.2
  }
  if (ctx.emotion === 'wonder' || ctx.actionLevel < 0.3) {
    depthLayering = 'deep'
    subjectPlacement = 'low_frame'
    lightingFocus = 'environment'
    foregroundWeight = 0.5
  }
  if (ctx.actionLevel > 0.7) {
    subjectPlacement = 'center'
    lightingFocus = 'character'
    readability = 0.9
    depthLayering = 'medium'
  }
  if (ctx.suspenseLevel > 0.65) {
    lightingFocus = 'silhouette'
    depthLayering = 'deep'
    readability = 0.7
  }

  if (styleId === 'comic_panel') {
    subjectPlacement = 'center'
    readability = 0.95
    foregroundWeight = 0.4
  }
  if (styleId === 'cinematic_anime') {
    depthLayering = 'deep'
    lightingFocus = ctx.emotion === 'sadness' ? 'character' : lightingFocus
  }

  return {
    depthLayering,
    subjectPlacement,
    foregroundWeight: Math.min(1, foregroundWeight),
    lightingFocus,
    readability: Math.min(1, readability)
  }
}
