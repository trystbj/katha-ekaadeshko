import type { EvolutionSceneExtensions } from '../../../../core/cinematic/evolutionTypes'
import type { CinematicScenePlan } from '../../../../core/cinematic/types'
import type { UltimateSceneExtensions } from '../../../../core/cinematic/ultimateTypes'

type EvolutionScene = CinematicScenePlan &
  Partial<UltimateSceneExtensions> &
  Partial<EvolutionSceneExtensions>

/** CSS vars for art evolution, symbolism, memory sequences, render pipeline hints. */
export function evolutionSceneStyleVars(
  scene: EvolutionScene | null | undefined,
  performanceScale = 1
): Record<string, string> {
  if (!scene) return {}
  const scale = Math.max(0.2, Math.min(1, performanceScale))
  const art = scene.artEvolution
  const mem = scene.memorySequence
  const render = scene.renderPipeline
  const out: Record<string, string> = {}

  if (art) {
    out['--cin-evo-warmth'] = String(art.warmth * scale)
    out['--cin-evo-contrast'] = String(art.contrast * scale)
    out['--cin-evo-saturation'] = String(art.saturation * scale)
    out['--cin-evo-shadow'] = String(art.shadowDepth * scale)
    out['--cin-evo-atmos'] = String(art.atmosphereDensity * scale)
  }
  if (mem && mem.kind !== 'none') {
    out['--cin-evo-memory'] = String(mem.intensity * scale)
    out['--cin-evo-memory-kind'] = mem.kind === 'nightmare' ? '1' : '0.5'
  }
  if (render) {
    out['--cin-evo-bloom'] = String((render.bloom ?? 0) * scale)
    out['--cin-evo-fog-vol'] = String((render.volumetricFog ?? 0) * scale)
    out['--cin-evo-blur'] = String((render.cinematicBlur ?? 0) * scale)
  }
  if (scene.symbolism?.colorTone === 'cool') out['--cin-evo-cool'] = '1'
  if (scene.symbolism?.colorTone === 'warm') out['--cin-evo-warm'] = '1'

  return out
}

export function memorySequenceClass(scene: EvolutionScene | null | undefined): string {
  if (!scene?.memorySequence || scene.memorySequence.kind === 'none') return ''
  const k = scene.memorySequence.kind
  if (k === 'flashback' || k === 'recollection') return 'cinematic-player__motion-layer--memory-flashback'
  if (k === 'dream' || k === 'symbolic_vision') return 'cinematic-player__motion-layer--memory-dream'
  if (k === 'nightmare') return 'cinematic-player__motion-layer--memory-nightmare'
  return 'cinematic-player__motion-layer--memory-montage'
}
