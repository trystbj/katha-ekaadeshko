import { useMemo } from 'react'
import type { CinematicDirectorPlan } from '../../../../core/cinematic/types'
import type { CinematicDirectorPlanV3 } from '../../../../core/cinematic/ultimateTypes'
import type { CinematicDirectorPlanV4 } from '../../../../core/cinematic/evolutionTypes'
import type { VideoMotionPreset } from '../types/videoStudio'
import { environmentReactionStyleVars, scenePlanAt } from './environmentCss'
import { actingMotionClass, ultimateSceneStyleVars } from './cameraVfxCss'
import { evolutionSceneStyleVars, memorySequenceClass } from './evolutionCss'
import { inferClientPerformanceScale, vfxDensityCap } from './smartPerformance'

export function useCinematicScene(
  cinematicPlan:
    | CinematicDirectorPlan
    | CinematicDirectorPlanV3
    | CinematicDirectorPlanV4
    | Record<string, unknown>
    | null
    | undefined,
  sceneIndex: number,
  fallbackMotion: VideoMotionPreset
) {
  return useMemo(() => {
    const plan = cinematicPlan as CinematicDirectorPlanV4 | null | undefined
    const scene = scenePlanAt(plan, sceneIndex)
    if (!scene || plan?.autoDirected === false) {
      return {
        motionPreset: fallbackMotion,
        envStyle: {} as Record<string, string>,
        ultimateStyle: {} as Record<string, string>,
        evolutionStyle: {} as Record<string, string>,
        actingClass: '',
        memoryClass: '',
        expression: null,
        subtitleLeadInMs: 0,
        musicTheme: null as string | null
      }
    }
    const perfScale = inferClientPerformanceScale(plan?.performance)
    const vfxScale = Math.min(perfScale, vfxDensityCap(plan?.performance))
    const motionPreset = (scene.motion?.preset as VideoMotionPreset) || fallbackMotion
    const envStyle = environmentReactionStyleVars(scene.environment)
    const ultimateStyle = ultimateSceneStyleVars(scene, vfxScale)
    const evolutionStyle = evolutionSceneStyleVars(scene, perfScale)
    return {
      motionPreset,
      envStyle: { ...envStyle, ...ultimateStyle, ...evolutionStyle },
      ultimateStyle: { ...ultimateStyle, ...evolutionStyle },
      evolutionStyle,
      actingClass: actingMotionClass(scene),
      memoryClass: memorySequenceClass(scene),
      expression: scene.expression,
      subtitleLeadInMs: scene.subtitle?.leadInMs ?? 0,
      filterHint: scene.environment?.filterHint,
      musicTheme: (scene as { music?: { theme?: string } }).music?.theme ?? null
    }
  }, [cinematicPlan, sceneIndex, fallbackMotion])
}
