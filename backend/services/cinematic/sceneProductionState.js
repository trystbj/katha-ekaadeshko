/**
 * Per-scene production state for regeneration, review gates, and continuity.
 */

/**
 * @param {object} row script row
 * @param {number} sceneIndex 1-based
 * @param {object} [ctx]
 */
export function buildSceneProductionState(row, sceneIndex, ctx = {}) {
  const r = row && typeof row === 'object' ? row : {}
  const dialogue = Array.isArray(r.dialogue)
    ? r.dialogue.map((d) => ({
        character: String(d?.character || '').trim(),
        line: String(d?.line || '').trim()
      }))
    : []

  const characters = dialogue.map((d) => d.character).filter(Boolean)
  const continuityRow = ctx.continuityPack?.sceneContinuity?.find((s) => s.sceneIndex === sceneIndex)

  return {
    story: String(r.narration || r.composed_narration || '').trim(),
    dialogue,
    characters: [...new Set(characters)],
    environment: String(r.environment || r.visual_description || '').trim(),
    emotion: String(r.emotional_tone || r.emotionalTone || ctx.directives?.sceneMood || '').trim(),
    camera: String(r.camera_direction || r.cameraDirection || '').trim(),
    lighting: String(r.lighting || ctx.directives?.lightingStyle || '').trim(),
    imageStatus: continuityRow?.imageUrl ? 'ready' : 'pending',
    videoStatus: 'pending',
    reviewed: false,
    continuityId: continuityRow?.continuityId || `scene:${sceneIndex}`,
    leonardoPrompt: String(r.leonardo_prompt || r.leonardoPrompt || '').trim() || undefined,
    animationPrompt: String(r.animation_prompt || r.animationPrompt || '').trim() || undefined
  }
}

/**
 * @param {object[]} script
 * @param {object} ctx
 */
export function buildAllSceneProductionStates(script = [], ctx = {}) {
  return script.map((row, i) => {
    const sceneNum = Number(row?.scene) > 0 ? Number(row.scene) : i + 1
    return buildSceneProductionState(row, sceneNum, ctx)
  })
}
