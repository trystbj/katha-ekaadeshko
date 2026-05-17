import type { UltimateSceneExtensions } from '../../../../core/cinematic/ultimateTypes'
import type { CinematicScenePlan } from '../../../../core/cinematic/types'

type UltimateScene = CinematicScenePlan & Partial<UltimateSceneExtensions>

/** CSS vars for camera breathing, VFX particles, and acting posture (additive overlay). */
export function ultimateSceneStyleVars(
  scene: UltimateScene | null | undefined,
  performanceScale = 1
): Record<string, string> {
  if (!scene) return {}
  const scale = Math.max(0.2, Math.min(1, performanceScale))
  const cam = scene.camera
  const vfx = scene.vfx
  const acting = scene.acting
  const out: Record<string, string> = {}

  if (cam) {
    out['--cin-cam-breath'] = String((cam.breathing ?? 0) * scale)
    out['--cin-cam-shake'] = String((cam.shakeIntensity ?? 0) * scale)
    out['--cin-cam-parallax'] = String((cam.parallaxDepth ?? 0) * scale)
  }
  if (vfx) {
    out['--cin-vfx-rain'] = String((vfx.rain ?? 0) * scale)
    out['--cin-vfx-snow'] = String((vfx.snow ?? 0) * scale)
    out['--cin-vfx-fog'] = String((vfx.fog ?? 0) * scale)
    out['--cin-vfx-glow'] = String((vfx.magicalGlow ?? 0) * scale)
    out['--cin-vfx-speed'] = String((vfx.speedLines ?? 0) * scale)
    out['--cin-vfx-rays'] = String((vfx.lightRays ?? 0) * scale)
    out['--cin-vfx-intensity'] = String((vfx.intensity ?? 0) * scale)
  }
  if (acting) {
    out['--cin-act-gesture'] = String(acting.gestureIntensity ?? 0.4)
    out['--cin-act-still'] = acting.stillnessMoment ? '1' : '0'
  }
  return out
}

export function actingMotionClass(scene: UltimateScene | null | undefined): string {
  if (!scene?.acting) return ''
  const idle = scene.acting.idleMotion
  if (idle === 'nervous') return 'cinematic-player__motion-layer--act-nervous'
  if (idle === 'energetic') return 'cinematic-player__motion-layer--act-energetic'
  if (idle === 'still') return 'cinematic-player__motion-layer--act-still'
  return ''
}
