/**
 * Storyboard rhythm + emotional progression plan (injected before visual generation).
 */

/**
 * @param {Record<string, unknown>[]} script
 * @param {object} directives production directives
 */
export function buildStoryboardDirectorPlan(script = [], directives = {}) {
  const rows = Array.isArray(script) ? script : []
  const beats = rows.map((row, i) => {
    const sceneIndex = Number(row.scene) > 0 ? Number(row.scene) : i + 1
    const mood = String(row.mood || row.emotional_tone || '').trim()
    const env = String(row.environment || row.location || '').trim()
    const camera = String(row.camera || row.camera_angle || 'medium').trim()
    return {
      sceneIndex,
      emotionalBeat: mood || directives.emotion || 'story beat',
      environmentContinuity: env,
      cameraGrammar: camera,
      transitionHint: i === 0 ? 'establish' : i === rows.length - 1 ? 'resolve' : 'connect'
    }
  })

  return {
    version: 1,
    pacing: directives.pacing || 'balanced_episodic',
    emotionalArc: directives.emotion || 'cinematic_drama',
    cameraLanguage: directives.cameraStyle || 'motivated_coverage',
    lightingGrammar: directives.lightingStyle || 'motivated_soft_cinematic',
    beats,
    directorNotes: String(directives.directorNotes || '').trim()
  }
}

/**
 * @param {ReturnType<typeof buildStoryboardDirectorPlan>} plan
 * @param {number} sceneIndex
 */
export function storyboardBeatForScene(plan, sceneIndex) {
  return plan?.beats?.find((b) => b.sceneIndex === sceneIndex) || null
}

export function storyboardDirectorPromptBlock(plan) {
  if (!plan?.beats?.length) return ''
  const arc = plan.beats
    .map((b) => `Scene ${b.sceneIndex}: ${b.emotionalBeat} (${b.transitionHint}, ${b.cameraGrammar})`)
    .join('; ')
  return [
    'CINEMATIC STORYBOARD DIRECTOR — one continuous film, not random images:',
    `Pacing: ${plan.pacing}. Emotional arc: ${plan.emotionalArc}.`,
    `Shot progression: ${arc}.`,
    plan.directorNotes ? `Notes: ${plan.directorNotes}` : ''
  ]
    .filter(Boolean)
    .join('\n')
}
