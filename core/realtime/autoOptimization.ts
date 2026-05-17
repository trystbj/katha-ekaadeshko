import type { DeviceOptimizationProfile, PreviewQualityTier } from './productionTypes'

/** Infer client device tier for adaptive preview/render load. */
export function detectDeviceOptimizationProfile(): DeviceOptimizationProfile {
  if (typeof navigator === 'undefined') {
    return { tier: 'medium', motionScale: 0.72, vfxDensity: 0.55, previewTier: 'cinematic' }
  }

  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  const cores = navigator.hardwareConcurrency ?? 4
  const reduced =
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

  if (reduced || (mem != null && mem <= 2) || cores <= 2) {
    return { tier: 'low', motionScale: 0.42, vfxDensity: 0.32, previewTier: 'lightweight' }
  }
  if ((mem != null && mem <= 4) || cores <= 4) {
    return { tier: 'medium', motionScale: 0.68, vfxDensity: 0.52, previewTier: 'cinematic' }
  }
  return { tier: 'high', motionScale: 0.92, vfxDensity: 0.78, previewTier: 'cinematic' }
}

export function mergeOptimizationWithTier(
  device: DeviceOptimizationProfile,
  requestedTier: PreviewQualityTier
): DeviceOptimizationProfile {
  if (requestedTier === 'lightweight') {
    return { ...device, motionScale: Math.min(device.motionScale, 0.55), vfxDensity: Math.min(device.vfxDensity, 0.4), previewTier: 'lightweight' }
  }
  if (requestedTier === 'final' && device.tier === 'low') {
    return { ...device, previewTier: 'cinematic', motionScale: device.motionScale * 1.05 }
  }
  return { ...device, previewTier: requestedTier }
}
