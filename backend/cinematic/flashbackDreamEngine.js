/**
 * Flashback, dream, memory fragment detection and visual/audio treatment.
 */

/**
 * @param {ReturnType<import('./sceneContext.js').analyzeSceneContext>} ctx
 * @param {string} blob
 * @param {number} sceneIndex
 * @param {object} [storyMemory]
 */
export function inferMemorySequence(ctx, blob, sceneIndex, storyMemory) {
  let kind = 'none'
  let intensity = 0
  let visualTreatment = 'none'
  let audioTreatment = 'normal'

  if (/\b(remember|memory|years ago|back then|used to|once upon)\b/i.test(blob)) {
    kind = 'flashback'
    intensity = 0.65
    visualTreatment = 'desaturated'
    audioTreatment = 'distant'
  }
  if (/\b(dream|nightmare|vision|hallucinat|sleep)\b/i.test(blob)) {
    kind = /\bnightmare\b/i.test(blob) ? 'nightmare' : 'dream'
    intensity = 0.75
    visualTreatment = kind === 'nightmare' ? 'high_contrast' : 'soft_glow'
    audioTreatment = kind === 'nightmare' ? 'muffled' : 'echo'
  }
  if (/\b(flash|fragment|flashes of|montage)\b/i.test(blob)) {
    kind = 'memory_fragment'
    intensity = 0.55
    visualTreatment = 'grain'
    audioTreatment = 'echo'
  }
  if (/\b(vision|prophecy|symbolic|omen)\b/i.test(blob)) {
    kind = 'symbolic_vision'
    intensity = 0.7
    visualTreatment = 'soft_glow'
    audioTreatment = 'echo'
  }
  if (storyMemory?.emotionalHistory?.some((e) => /trauma|betrayal/i.test(e)) && ctx.emotion === 'fear') {
    if (kind === 'none' && sceneIndex > 2) {
      kind = 'recollection'
      intensity = 0.5
      visualTreatment = 'desaturated'
      audioTreatment = 'muffled'
    }
  }
  if (ctx.emotion === 'sadness' && /\b(montage|memories flood)\b/i.test(blob)) {
    kind = 'emotional_montage'
    intensity = 0.6
    visualTreatment = 'soft_glow'
    audioTreatment = 'distant'
  }

  return { kind, intensity, visualTreatment, audioTreatment }
}

/** Adapt scene for memory sequences. */
export function applyMemorySequenceToScene(scene, memorySeq) {
  if (!scene || !memorySeq || memorySeq.kind === 'none') return scene
  if (scene.environment) {
    if (memorySeq.visualTreatment === 'desaturated') {
      scene.environment.warmth = Math.max(0, (scene.environment.warmth ?? 0.5) - 0.15)
      scene.environment.fog = Math.min(1, (scene.environment.fog ?? 0) + 0.2)
    }
    if (memorySeq.visualTreatment === 'soft_glow') {
      scene.environment.particles = Math.min(1, (scene.environment.particles ?? 0) + 0.25)
    }
  }
  if (scene.vfx) {
    scene.vfx.intensity = Math.min(1, (scene.vfx.intensity ?? 0.5) + memorySeq.intensity * 0.2)
  }
  if (scene.music && memorySeq.audioTreatment !== 'normal') {
    scene.music.transition = 'fade_in'
    scene.music.intensity = Math.min(1, (scene.music.intensity ?? 0.5) * 0.85)
  }
  if (scene.subtitle) {
    scene.subtitle.animationStyle = memorySeq.kind === 'nightmare' ? 'dramatic' : 'calm'
  }
  return scene
}
