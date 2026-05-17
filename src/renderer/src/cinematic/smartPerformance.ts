import type { SmartPerformanceProfile } from '../../../../core/cinematic/ultimateTypes'

/** Client-side performance tier from plan hints + device signals. */
export function inferClientPerformanceScale(
  planPerformance: SmartPerformanceProfile | null | undefined
): number {
  if (planPerformance?.tier === 'low') return planPerformance.motionQuality ?? 0.45
  if (planPerformance?.tier === 'high') return planPerformance.motionQuality ?? 1
  if (planPerformance?.motionQuality != null) return planPerformance.motionQuality

  if (typeof navigator === 'undefined') return 0.72
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  if (mem != null && mem <= 4) return 0.5
  const reduced =
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  if (reduced) return 0.4
  return 0.72
}

export function vfxDensityCap(planPerformance: SmartPerformanceProfile | null | undefined): number {
  return planPerformance?.vfxDensity ?? 0.6
}
