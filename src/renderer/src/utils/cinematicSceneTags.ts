import type { CinematicScenePlan, SceneEmotion } from '../../../../core/cinematic/types'
import type { StoryScene } from '../types/story'

export type CinematicSceneTagId =
  | 'romance'
  | 'sadness'
  | 'tension'
  | 'dramatic'
  | 'flashback'
  | 'calm'
  | 'mystery'
  | 'action'
  | 'peak'
  | 'continuity'
  | 'hook'
  | 'graded'

const TAG_I18N: Record<CinematicSceneTagId, string> = {
  romance: 'cineTagRomance',
  sadness: 'cineTagSadness',
  tension: 'cineTagTension',
  dramatic: 'cineTagDramatic',
  flashback: 'cineTagFlashback',
  calm: 'cineTagCalm',
  mystery: 'cineTagMystery',
  action: 'cineTagAction',
  peak: 'cineTagPeak',
  continuity: 'cineTagContinuity',
  hook: 'cineTagHook',
  graded: 'cineTagGraded'
}

export function cinematicTagI18nKey(tag: CinematicSceneTagId): string {
  return TAG_I18N[tag]
}

export function inferCinematicSceneTags(
  scene: StoryScene,
  plan: CinematicScenePlan | null | undefined,
  emotionProfile?: { romance?: number; dramaticIntensity?: number; suspense?: number },
  premiumHints?: { hookSceneIndices?: number[]; sceneIndex?: number }
): CinematicSceneTagId[] {
  const tags = new Set<CinematicSceneTagId>()
  const blob = `${scene.text} ${scene.visualDescription ?? ''}`.toLowerCase()

  const emotion = plan?.emotion as SceneEmotion | undefined
  const tension = plan?.tension ?? 0
  const action = plan?.actionLevel ?? 0
  const suspense = plan?.suspenseLevel ?? 0

  if (emotion === 'joy' || /\b(love|kiss|romance|heart)\b/.test(blob)) tags.add('romance')
  if (emotion === 'sadness' || /\b(sad|tear|grief|lonely|loss)\b/.test(blob)) tags.add('sadness')
  if (emotion === 'tension' || emotion === 'suspense' || tension > 0.55 || suspense > 0.5)
    tags.add('tension')
  if (emotion === 'fear' || emotion === 'anger' || action > 0.6) tags.add('action')
  if (emotion === 'wonder' || emotion === 'peace' || /\b(calm|quiet|still|peace)\b/.test(blob))
    tags.add('calm')
  if (/\b(mystery|secret|shadow|whisper|unknown)\b/.test(blob)) tags.add('mystery')
  if (/\b(flashback|memory|years ago|remember)\b/.test(blob)) tags.add('flashback')
  if (
    (emotionProfile?.dramaticIntensity ?? 0) > 0.72 ||
    tension > 0.72 ||
    suspense > 0.72 ||
    plan?.subtitle?.emphasis === 'high'
  )
    tags.add('peak')
  if (tags.size === 0 && (emotion === 'surprise' || tension > 0.4)) tags.add('dramatic')
  if (tags.size === 0) tags.add('calm')
  if ((plan as { aiDirector?: { holdSceneLonger?: boolean } })?.aiDirector?.holdSceneLonger) {
    tags.add('continuity')
  }
  if ((plan as { colorGrade?: { lut?: string } })?.colorGrade?.lut) tags.add('graded')
  const si = premiumHints?.sceneIndex ?? scene.index
  if (premiumHints?.hookSceneIndices?.includes(si)) tags.add('hook')

  return [...tags].slice(0, 6)
}

export function motionIndicatorLabel(preset: string | undefined): string {
  const p = String(preset || 'static')
  if (p.includes('zoom')) return 'cineMotionZoom'
  if (p.includes('pan') || p.includes('push')) return 'cineMotionPan'
  if (p.includes('parallax') || p.includes('float') || p.includes('orbit')) return 'cineMotionDrift'
  if (p.includes('shake') || p.includes('handheld')) return 'cineMotionShake'
  if (p === 'static') return 'cineMotionStatic'
  return 'cineMotionAuto'
}

export function transitionHintFromPlan(plan: CinematicScenePlan | null): string {
  if (!plan) return 'cineTransitionCut'
  if (plan.audioMix?.silencePadMs && plan.audioMix.silencePadMs > 400) return 'cineTransitionPause'
  if (plan.motion?.preset?.includes('shake')) return 'cineTransitionImpact'
  if (plan.environment?.fog > 0.4) return 'cineTransitionDissolve'
  return 'cineTransitionFlow'
}
