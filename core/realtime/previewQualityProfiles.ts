import type { PreviewQualityProfile, PreviewQualityTier, ProductionWorkflowMode } from './productionTypes'

/** Quick vs production workflow affects default preview richness. */
export function resolvePreviewQualityProfile(
  mode: ProductionWorkflowMode,
  tier: PreviewQualityTier
): PreviewQualityProfile {
  const base: Record<PreviewQualityTier, Omit<PreviewQualityProfile, 'label'>> = {
    lightweight: {
      motionScale: 0.55,
      vfxDensity: 0.35,
      particleDensity: 0.25,
      audioLayers: 1,
      sharpenPreview: 0.1,
      grain: 0
    },
    cinematic: {
      motionScale: 0.82,
      vfxDensity: 0.62,
      particleDensity: 0.5,
      audioLayers: 2,
      sharpenPreview: 0.22,
      grain: 0.08
    },
    final: {
      motionScale: 1,
      vfxDensity: 0.95,
      particleDensity: 0.9,
      audioLayers: 3,
      sharpenPreview: 0.35,
      grain: 0.12
    }
  }

  const pick = base[tier]
  const modeMul = mode === 'quick' ? 0.88 : 1

  return {
    label: tier,
    motionScale: pick.motionScale * modeMul,
    vfxDensity: pick.vfxDensity * modeMul,
    particleDensity: pick.particleDensity * modeMul,
    audioLayers: mode === 'quick' ? Math.min(2, pick.audioLayers) : pick.audioLayers,
    sharpenPreview: pick.sharpenPreview * modeMul,
    grain: pick.grain * modeMul
  }
}

export function defaultPreviewTierForMode(mode: ProductionWorkflowMode): PreviewQualityTier {
  return mode === 'quick' ? 'lightweight' : 'cinematic'
}
