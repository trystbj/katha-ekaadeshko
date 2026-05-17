/**
 * Real-time cinematic reasoning — highest-level per-scene orchestration state.
 */

/**
 * @param {ReturnType<import('./sceneContext.js').analyzeSceneContext>} ctx
 * @param {number} sceneIndex
 * @param {number} sceneCount
 * @param {object} [world]
 * @param {Array<object>} [relationships]
 * @param {object} [personality]
 */
export function inferCinematicReasoning(ctx, sceneIndex, sceneCount, world, relationships, personality) {
  const progress = sceneCount > 1 ? sceneIndex / (sceneCount - 1) : 0.5
  let orchestrationPriority = 'atmosphere'
  if (ctx.actionLevel > 0.7) orchestrationPriority = 'action'
  else if (ctx.emotion === 'surprise' || progress > 0.85) orchestrationPriority = 'reveal'
  else if (ctx.emotion === 'sadness' || ctx.emotion === 'joy') orchestrationPriority = 'character'
  else if (world?.magicalCorruption > 0.5 || ctx.tension > 0.7) orchestrationPriority = 'theme'

  const relTension =
    relationships?.length > 0
      ? Math.max(...relationships.map((e) => Math.max(e.rivalry ?? 0, e.hatred ?? 0, 1 - (e.trust ?? 0.5))))
      : 0

  let audienceExpectation = 'steady engagement'
  if (progress < 0.15) audienceExpectation = 'establish world and tone'
  else if (progress > 0.75) audienceExpectation = 'payoff or cliffhanger pressure'
  if (ctx.suspenseLevel > 0.7) audienceExpectation = 'rising suspense'

  const cinematicImportance = Math.min(
    1,
    ctx.tension * 0.35 + ctx.actionLevel * 0.25 + ctx.suspenseLevel * 0.25 + progress * 0.15
  )

  const narrativeMomentum = Math.min(
    1,
    (personality?.pacingMul ?? 1) * (0.4 + progress * 0.4 + ctx.actionLevel * 0.2)
  )

  const symbolicWeight = Math.min(1, (world?.magicalCorruption ?? 0) * 0.3 + relTension * 0.25 + ctx.tension * 0.2)

  const subtext =
    ctx.emotion === 'fear'
      ? 'unspoken dread'
      : ctx.emotion === 'sadness'
        ? 'loss beneath words'
        : relTension > 0.5
          ? 'strained bond'
          : 'surface narrative'

  return {
    emotionalState: ctx.emotion,
    audienceExpectation,
    thematicWeight: Math.min(1, ctx.tension + (world?.politicalTension ?? 0) * 0.2),
    cinematicImportance,
    subtext,
    narrativeMomentum,
    symbolicWeight,
    orchestrationPriority
  }
}

/**
 * Fuse reasoning into scene layers (orchestration weights).
 * @param {object} scene
 * @param {object} reasoning
 */
export function applyReasoningOrchestration(scene, reasoning) {
  if (!scene || !reasoning) return scene
  const pri = reasoning.orchestrationPriority
  const imp = reasoning.cinematicImportance ?? 0.5

  if (pri === 'action' && scene.camera) {
    scene.camera.shakeIntensity = Math.min(1, (scene.camera.shakeIntensity ?? 0) + imp * 0.2)
  }
  if (pri === 'character' && scene.acting) {
    scene.acting.reactionDelayMs = Math.round((scene.acting.reactionDelayMs ?? 120) * 1.15)
  }
  if (pri === 'reveal' && scene.subtitle) {
    scene.subtitle.emphasis = 'high'
    scene.subtitle.leadInMs = Math.max(scene.subtitle.leadInMs ?? 0, Math.round(imp * 180))
  }
  if (pri === 'theme' && scene.environment) {
    scene.environment.fog = Math.min(1, (scene.environment.fog ?? 0) + reasoning.symbolicWeight * 0.15)
  }
  if (scene.audioMix) {
    scene.audioMix.musicGainMul = Math.min(
      1.2,
      (scene.audioMix.musicGainMul ?? 1) * (1 + (reasoning.thematicWeight ?? 0) * 0.08)
    )
  }
  return scene
}

export function buildEpisodeReasoningMeta(scenes) {
  const momentum =
    scenes.length > 0
      ? scenes.reduce((s, sc) => s + (sc.reasoning?.narrativeMomentum ?? 0.5), 0) / scenes.length
      : 0.5
  return { syncVersion: 1, episodeMomentum: Math.round(momentum * 100) / 100 }
}
