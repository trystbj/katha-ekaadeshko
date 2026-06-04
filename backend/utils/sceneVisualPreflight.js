/**
 * Validate script row + studio input before Leonardo request.
 * @param {object} scriptRow
 * @param {object} input
 * @param {number} sceneKey
 */
export function validateSceneVisualPreflight(scriptRow, input, sceneKey) {
  const issues = []
  const vd = String(scriptRow?.visual_description || '').trim()
  const nar = String(scriptRow?.narration || scriptRow?.composed_narration || '').trim()
  if (!vd && !nar) issues.push('no_scene_description')
  const styleId = String(input?.styleId || '').trim()
  const custom = String(input?.customVisualPrompt || '').trim()
  if (!styleId && !custom) issues.push('style_preset_missing')
  const cast = Array.isArray(input?.bibleCharacters) ? input.bibleCharacters : []
  if (!cast.length && !Array.isArray(input?.__story?.characters)) {
    issues.push('character_references_missing')
  }
  const env = String(scriptRow?.environment || scriptRow?.location || '').trim()
  if (!env && !String(input?.setting || input?.theme || '').trim()) {
    issues.push('environment_missing')
  }
  return {
    ok: issues.length === 0,
    scene: sceneKey,
    issues,
    promptSeedLen: (vd || nar).length
  }
}
