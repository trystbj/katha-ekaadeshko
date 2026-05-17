import type { EmotionArcPoint } from './productionTypes'

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback
}

/** Build per-scene emotional / pacing arc from cinematic director plan. */
export function extractEmotionArc(
  plan: Record<string, unknown> | null | undefined,
  sceneCount: number
): EmotionArcPoint[] {
  const scenes = (plan?.scenes as Array<Record<string, unknown>>) ?? []
  const units = (plan?.orchestration as { sceneUnits?: Array<Record<string, unknown>> } | undefined)?.sceneUnits ?? []

  const out: EmotionArcPoint[] = []
  for (let i = 0; i < sceneCount; i++) {
    const sc = scenes[i] ?? {}
    const unit = units[i] ?? {}
    const pacing = (sc.pacing as Record<string, unknown>) ?? {}
    const music = (sc.music as Record<string, unknown>) ?? {}
    const emotion = (sc.emotion as Record<string, unknown>) ?? (unit.emotionProfile as Record<string, unknown>) ?? {}

    const beatWeight = num(pacing.beatWeight, 0.5)
    const intensity = num(emotion.intensity ?? emotion.valence, 0.5)
    const musicInt = num(music.intensity, 0.45)
    const tension = num(unit.tensionLevel ?? emotion.tension, beatWeight * 0.7 + intensity * 0.3)

    out.push({
      sceneIndex: i + 1,
      emotionalIntensity: intensity,
      pacingIntensity: beatWeight,
      soundtrackEnergy: musicInt,
      tension,
      beatType: typeof unit.beatType === 'string' ? unit.beatType : undefined
    })
  }
  return out
}
