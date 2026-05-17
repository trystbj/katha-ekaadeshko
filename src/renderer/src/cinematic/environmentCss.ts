import type { CinematicScenePlan, EnvironmentReactionCue } from '../../../../core/cinematic/types'

/** CSS custom properties for environment reaction overlay (lightweight, no layout change). */
export function environmentReactionStyleVars(env: EnvironmentReactionCue): Record<string, string> {
  return {
    '--cin-fog': String(env.fog),
    '--cin-rain': String(env.rain),
    '--cin-wind': String(env.wind),
    '--cin-particles': String(env.particles),
    '--cin-shake': String(env.shake),
    '--cin-warmth': String(env.warmth),
    '--cin-light': env.lightingMood === 'bright' ? '1.06' : env.lightingMood === 'dark' ? '0.88' : '1'
  }
}

export function scenePlanAt(
  plan: { scenes: CinematicScenePlan[] } | null | undefined,
  sceneIndex: number
): CinematicScenePlan | null {
  if (!plan?.scenes?.length) return null
  return plan.scenes[sceneIndex] ?? plan.scenes[Math.min(sceneIndex, plan.scenes.length - 1)] ?? null
}
