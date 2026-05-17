/**
 * AI Cinematic Director — orchestrates voice, expression, ambience, SFX, mix, environment, motion, subtitles.
 */

import { analyzeSceneContext } from './sceneContext.js'
import { inferCharacterExpression } from './characterExpression.js'
import { inferEnvironmentReaction } from './environmentReaction.js'
import { inferAmbienceCue } from './ambienceDirector.js'
import { inferSceneMotion } from './motionDirector.js'
import { mixSegmentAudio, applyEmotionalMixToAudioPlan } from './emotionalAudioMixer.js'
import { inferNarrativePhase } from '../utils/buildStoryAudioPlan.js'
import { inferSfxCues } from '../utils/buildStoryAudioPlan.js'
import { buildVoiceDirection, analyzeVoiceProfile } from '../voice/voiceDirector.js'
function inferSubtitleCue(ctx, voiceDir) {
  let animationStyle = 'calm'
  if (ctx.actionLevel > 0.7) animationStyle = 'pulse'
  if (ctx.emotion === 'surprise' || ctx.suspenseLevel > 0.7) animationStyle = 'dramatic'
  if (ctx.emotion === 'joy' && ctx.actionLevel < 0.4) animationStyle = 'karaoke'

  return {
    revealBias: voiceDir.subtitleRevealBias ?? 1,
    leadInMs: Math.round((voiceDir.pauseBiasMs ?? 180) * 0.12),
    emphasis: voiceDir.emphasis ?? 'medium',
    animationStyle
  }
}

function suggestNarratorId(input, profile) {
  const pref = String(input?.narratorGenderPreference || 'auto').toLowerCase()
  if (pref && pref !== 'auto') {
    if (pref === 'female' || pref === 'child') return 'penguin'
    if (['male', 'elder', 'dark_entity', 'anime_villain', 'anime_hero', 'mythical'].includes(pref)) {
      return 'tryst_bj'
    }
  }
  const g = profile.gender
  if (g === 'female' || g === 'child') return 'penguin'
  return 'tryst_bj'
}

/**
 * Build per-scene cinematic plan.
 * @param {object} params
 * @param {Array<{ narration?: string, visual_description?: string }>} params.script
 * @param {object} params.input pipeline input
 * @param {object} [params.storyAudioPlan]
 */
export function buildCinematicDirectorPlan({ script, input, storyAudioPlan }) {
  const rows = Array.isArray(script) ? script : []
  const n = rows.length
  const autoDirected = input?.autoVoiceDirector !== false

  const voiceProfile = analyzeVoiceProfile({
    storyLanguage: input?.storyLanguage,
    languageId: input?.narrationLanguageId,
    genre: input?.genre,
    theme: input?.theme,
    storyTone: input?.storyTone,
    styleId: input?.styleId,
    customVisualPrompt: input?.customVisualPrompt,
    narratorId: input?.narratorId,
    seedLine: input?.seedLine,
    autoVoiceDirector: autoDirected,
    narratorGenderPreference: input?.narratorGenderPreference
  })

  const scenes = []
  for (let i = 0; i < n; i++) {
    const row = rows[i] || {}
    const narration = String(row.narration || '')
    const visual = String(row.visual_description || '')
    const ctx = analyzeSceneContext({
      narration,
      visualDescription: visual,
      genre: input?.genre,
      storyTone: input?.storyTone
    })
    const phase = inferNarrativePhase(i, n, narration, visual, input?.storyTone)
    const styleId = input?.styleId || 'soft_anime_fantasy'

    const voiceDir = autoDirected
      ? buildVoiceDirection({
          narration,
          visualDescription: visual,
          genre: input?.genre,
          theme: input?.theme,
          storyTone: input?.storyTone,
          storyLanguage: input?.storyLanguage,
          styleId,
          customVisualPrompt: input?.customVisualPrompt,
          narratorId: input?.narratorId,
          autoVoiceDirector: true,
          narratorGenderPreference: input?.narratorGenderPreference
        })
      : {
          pauseBiasMs: 180,
          subtitleRevealBias: 1,
          emphasis: 'medium',
          whisperBias: 0
        }

    const expression = inferCharacterExpression(ctx, styleId)
    const environment = inferEnvironmentReaction(ctx, styleId, input?.storyTone)
    const ambience = inferAmbienceCue(ctx, styleId)
    const motion = inferSceneMotion(ctx, styleId, phase)
    const subtitle = inferSubtitleCue(ctx, voiceDir)

    const baseSeg = storyAudioPlan?.segments?.[i] || { intensity: 0.45 }
    const mixed = mixSegmentAudio(baseSeg, ctx, expression, styleId)

    scenes.push({
      sceneIndex: i + 1,
      emotion: ctx.emotion,
      tension: ctx.tension,
      actionLevel: ctx.actionLevel,
      suspenseLevel: ctx.suspenseLevel,
      expression,
      ambience,
      environment,
      audioMix: {
        musicGainMul: mixed.musicGainMul ?? 1,
        sfxGainMul: mixed.sfxGainMul ?? 1,
        narratorGainMul: mixed.narratorGainMul ?? 1,
        silencePadMs: mixed.silencePadMs ?? 0
      },
      motion,
      subtitle,
      narrativePhase: phase
    })
  }

  return {
    version: 2,
    autoDirected,
    suggestedNarratorId: suggestNarratorId(input, voiceProfile),
    voiceProfile,
    scenes
  }
}

/**
 * Enhance storyAudioPlan with cinematic mix + extra SFX from scene analysis.
 */
export function enhanceStoryAudioWithCinematicDirector(storyAudioPlan, cinematicPlan, script, secondsPerScene) {
  if (!storyAudioPlan || !cinematicPlan?.autoDirected) return storyAudioPlan

  const rows = Array.isArray(script) ? script : []
  const enhanced = applyEmotionalMixToAudioPlan(storyAudioPlan, cinematicPlan.scenes)

  const extraSfx = inferSfxCues(rows, secondsPerScene, 12)
  const existing = Array.isArray(enhanced.sfxCues) ? enhanced.sfxCues : []
  const mergedSfx = [...existing]
  const seen = new Set(existing.map((c) => `${c.sceneIndex}:${c.tag}`))
  for (const cue of extraSfx) {
    const k = `${cue.sceneIndex}:${cue.tag}`
    if (seen.has(k)) continue
    seen.add(k)
    const scenePlan = cinematicPlan.scenes[(cue.sceneIndex || 1) - 1]
    const mul = scenePlan?.audioMix?.sfxGainMul ?? 1
    mergedSfx.push({ ...cue, gain: (cue.gain ?? 0.07) * mul })
  }

  return {
    ...enhanced,
    sfxCues: mergedSfx.slice(0, 16),
    cinematicDirectorVersion: 2
  }
}
