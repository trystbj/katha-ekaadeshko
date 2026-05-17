/**
 * Future-ready advanced cinematic render pipeline hints (optional layers).
 */

/**
 * @param {object} scene enriched scene
 * @param {object} artEvolution
 * @param {object} memorySeq
 * @param {object} performance
 */
export function buildAdvancedRenderPipelineCue(scene, artEvolution, memorySeq, performance) {
  const tier = performance?.tier || 'balanced'
  const scale = tier === 'low' ? 0.4 : tier === 'high' ? 1 : 0.72

  const fogBase = scene.environment?.fog ?? 0
  const vfxInt = scene.vfx?.intensity ?? 0

  return {
    architectureVersion: 1,
    depthSimulation: Math.min(1, (artEvolution?.atmosphereDensity ?? 0.4) * scale),
    bloom: Math.min(1, (artEvolution?.warmth ?? 0.5) * 0.35 * scale),
    volumetricFog: Math.min(1, fogBase * scale),
    cinematicBlur: memorySeq?.kind !== 'none' ? 0.35 * scale : 0.12 * scale,
    dynamicLighting: Math.min(1, (artEvolution?.contrast ?? 0.5) * scale),
    lutPreset:
      artEvolution?.progressionPhase === 'darkening'
        ? 'cool_shadow'
        : artEvolution?.progressionPhase === 'healing'
          ? 'warm_hope'
          : null,
    particleLayer: Math.min(1, vfxInt * scale)
  }
}
