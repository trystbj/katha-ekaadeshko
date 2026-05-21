/**
 * AI Director Brain — cinematic film-director decisions from emotion, arc, and scene context.
 * Rule-based director (no extra LLM); feeds motion, pacing, subtitles, camera, and mix layers.
 */

import { buildEpisodePacingPlan } from './storyPacingEngine.js'
import { analyzeSceneContext } from './sceneContext.js'

const MOTION_BY_EMOTION = {
  fear: 'handheld_micro',
  suspense: 'slow_zoom_in',
  sadness: 'pull_out',
  joy: 'parallax_float',
  peace: 'smooth_pan',
  wonder: 'cinematic_push',
  anger: 'shake_dramatic',
  surprise: 'cinematic_push',
  tension: 'slow_zoom_in'
}

const SHOT_BY_INTENSITY = {
  low: 'wide_establishing',
  mid: 'medium_dramatic',
  high: 'close_emotional',
  peak: 'extreme_closeup'
}

/**
 * @param {number} n
 * @param {Array<{ beatType?: string; emotionalIntensity?: number }>} sceneUnits
 */
export function buildStoryArcPlan(sceneUnits = [], n = 0) {
  const count = n || sceneUnits.length || 1
  const phases = sceneUnits.map((u, i) => {
    const pos = count <= 1 ? 0 : i / Math.max(1, count - 1)
    if (i === 0) return 'introduction'
    if (pos < 0.28) return 'buildup'
    if (pos < 0.55) return 'emotional_development'
    if (pos < 0.78) return 'tension_growth'
    if (i === count - 1) return 'resolution'
    if (pos >= 0.72) return 'climax'
    return 'emotional_development'
  })

  return {
    version: 1,
    sceneCount: count,
    phases,
    climaxIndex: phases.lastIndexOf('climax') >= 0 ? phases.lastIndexOf('climax') + 1 : Math.max(1, Math.floor(count * 0.82)),
    introductionScenes: phases.map((p, i) => (p === 'introduction' ? i + 1 : null)).filter(Boolean),
    resolutionScene: phases.lastIndexOf('resolution') >= 0 ? phases.lastIndexOf('resolution') + 1 : count
  }
}

/**
 * @param {object} emotionProfile from emotionAnalysisEngine
 */
function directorScalars(emotionProfile = {}, arcPhase = 'body') {
  const tension = emotionProfile.tension ?? 0.35
  const suspense = emotionProfile.suspense ?? 0.25
  const warmth = emotionProfile.warmth ?? 0.45
  const romance = emotionProfile.romance ?? (emotionProfile.primary === 'joy' && warmth > 0.6 ? 0.7 : 0.15)
  const dramatic = emotionProfile.dramaticIntensity ?? Math.min(1, tension * 0.5 + suspense * 0.35 + (emotionProfile.escalation ?? 0.3) * 0.4)

  let pacingMul = 1
  if (arcPhase === 'introduction' || arcPhase === 'resolution') pacingMul = 1.12
  if (arcPhase === 'climax' || arcPhase === 'tension_growth') pacingMul = 0.88
  if (romance > 0.55 && dramatic < 0.5) pacingMul *= 1.06
  if (suspense > 0.65) pacingMul *= 0.92

  return { tension, suspense, warmth, romance, dramatic, pacingMul }
}

/**
 * Apply director brain to enriched cinematic scenes.
 * @param {object} params
 */
export function applyAiDirectorBrain(params) {
  const {
    enrichedScenes = [],
    emotionProfiles = [],
    sceneUnits = [],
    script = [],
    input = {},
    storyArc = null
  } = params

  const arc = storyArc || buildStoryArcPlan(sceneUnits, enrichedScenes.length)
  const episodePacing = buildEpisodePacingPlan(enrichedScenes)
  const genre = String(input?.genre || '').toLowerCase()
  const decisions = []

  for (let i = 0; i < enrichedScenes.length; i++) {
    const sc = enrichedScenes[i]
    const row = script[i] || {}
    const ep = emotionProfiles[i] || {}
    const unit = sceneUnits[i] || {}
    const phase = arc.phases[i] || 'body'
    const ctx = analyzeSceneContext({
      narration: row.narration,
      visualDescription: row.visual_description,
      genre: input?.genre,
      storyTone: input?.storyTone
    })
    const scalars = directorScalars(ep, phase)
    const isClimax = i + 1 === arc.climaxIndex
    const holdLonger =
      isClimax ||
      phase === 'emotional_development' ||
      scalars.romance > 0.6 ||
      unit.beatType === 'emotional'

    const motionPreset =
      sc?.motion?.preset && sc.motion.preset !== 'static'
        ? sc.motion.preset
        : MOTION_BY_EMOTION[ep.primary] || (scalars.tension > 0.65 ? 'slow_zoom_in' : 'cinematic_push')

    const shotIntensity =
      scalars.dramatic > 0.75 || isClimax ? 'peak' : scalars.dramatic > 0.5 ? 'high' : scalars.romance > 0.55 ? 'mid' : 'low'

    const silencePadMs =
      scalars.suspense > 0.55
        ? Math.round(280 + scalars.suspense * 420)
        : holdLonger
          ? Math.round(200 + scalars.warmth * 180)
          : scalars.tension > 0.7
            ? 240
            : 60

    const durationMul = holdLonger ? 1.18 * scalars.pacingMul : 0.94 * scalars.pacingMul
    const baseMs = sc?.timeline?.durationMs ?? (sc?.durationMs ?? 4000)
    const durationMs = Math.round(Math.min(12000, Math.max(2800, baseMs * durationMul)))

    const subtitleEmphasis =
      isClimax || scalars.dramatic > 0.72
        ? 'high'
        : scalars.romance > 0.55
          ? 'soft'
          : scalars.suspense > 0.5
            ? 'whisper'
            : 'normal'

    const zoomBias = scalars.tension > 0.6 || ep.primary === 'fear' ? 'push_in' : scalars.romance > 0.5 ? 'soft_push' : 'neutral'

    const decision = {
      sceneIndex: sc.sceneIndex ?? i + 1,
      arcPhase: phase,
      emotionalIntensity: Math.min(1, scalars.dramatic),
      romanceLevel: scalars.romance,
      suspenseLevel: scalars.suspense,
      holdSceneLonger: holdLonger,
      silencePadMs,
      durationMs,
      motionPreset,
      shotType: SHOT_BY_INTENSITY[shotIntensity],
      zoomBias,
      subtitleEmphasis,
      cutQuickly: phase === 'tension_growth' && scalars.tension > 0.75 && !holdLonger,
      musicMood:
        scalars.romance > 0.55
          ? 'romance'
          : scalars.suspense > 0.6
            ? 'suspense'
            : ep.primary === 'sadness'
              ? 'melancholy'
              : isClimax
                ? 'dramatic'
                : 'ambient',
      environmentFocus: genre.includes('horror') && scalars.suspense > 0.5 ? 'atmosphere' : 'character'
    }
    decisions.push(decision)

    enrichedScenes[i] = {
      ...sc,
      emotion: sc.emotion || ep.primary || ctx.emotion,
      tension: Math.max(sc.tension ?? 0, scalars.tension),
      suspenseLevel: Math.max(sc.suspenseLevel ?? 0, scalars.suspense),
      actionLevel: sc.actionLevel ?? ctx.actionLevel,
      durationMs,
      aiDirector: decision,
      motion: {
        ...(sc.motion || {}),
        preset: motionPreset,
        intensity: Math.min(1, (sc.motion?.intensity ?? 0.5) + (isClimax ? 0.15 : 0))
      },
      camera: {
        ...(sc.camera || {}),
        shotType: sc.camera?.shotType || decision.shotType,
        zoomBias: decision.zoomBias,
        parallaxDepth: scalars.romance > 0.5 ? 0.45 : scalars.suspense > 0.5 ? 0.35 : 0.25
      },
      composition: {
        ...(sc.composition || {}),
        focalPoint: decision.environmentFocus === 'character' ? 'character_face' : 'environment_mood',
        framingBalance: shotIntensity === 'peak' ? 'tight_emotional' : 'cinematic_thirds'
      },
      subtitle: {
        ...(sc.subtitle || {}),
        emphasis: subtitleEmphasis,
        leadInMs: sc.subtitle?.leadInMs ?? (holdLonger ? 120 : 60),
        revealPacing: subtitleEmphasis === 'whisper' ? 'slow' : isClimax ? 'punch' : 'natural'
      },
      audioMix: {
        ...(sc.audioMix || {}),
        silencePadMs: Math.max(sc.audioMix?.silencePadMs ?? 0, silencePadMs),
        musicMood: decision.musicMood,
        duckNarratorOnSfx: scalars.tension > 0.65
      }
    }
  }

  return {
    storyArc: arc,
    episodePacing,
    decisions,
    directorPersonality: input?.directorPersonalityPreference || 'cinematic_balanced'
  }
}
