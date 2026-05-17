import type { VoiceDirection, VoiceProfile } from '../../../../core/voice/types'
import { buildVoiceProfile, type VoiceProfileContext } from './voiceProfile'

export type VoiceDirectorContext = VoiceProfileContext & {
  visualDescription?: string
  autoVoiceDirector?: boolean
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function emotionDynamics(profile: VoiceProfile, blob: string) {
  let speedMul = 1
  let pauseBiasMs = 180
  let emphasis: VoiceDirection['emphasis'] = 'medium'
  let whisperBias = 0
  let subtitleRevealBias = 1

  if (profile.pacingStyle === 'calm') {
    speedMul *= 0.96
    pauseBiasMs += 40
  } else if (profile.pacingStyle === 'energetic') {
    speedMul *= 1.04
    pauseBiasMs -= 25
    emphasis = 'high'
  } else if (profile.pacingStyle === 'suspense') {
    speedMul *= 0.95
    pauseBiasMs += 55
    whisperBias = 0.15
    subtitleRevealBias = 0.92
  } else if (profile.pacingStyle === 'dramatic') {
    speedMul *= 0.98
    pauseBiasMs += 35
    emphasis = 'high'
    subtitleRevealBias = 0.9
  }

  if (profile.emotionStyle === 'horror') {
    speedMul *= 0.94
    whisperBias = 0.22
  } else if (profile.emotionStyle === 'comedy') {
    speedMul *= 1.03
  } else if (profile.emotionStyle === 'action') {
    speedMul *= 1.025
    emphasis = 'high'
  } else if (profile.emotionStyle === 'mystery') {
    pauseBiasMs += 45
    subtitleRevealBias = 0.88
  }

  if (/\b(whisper|hush|secret)\b/i.test(blob)) whisperBias = Math.max(whisperBias, 0.2)
  if (/\b(reveal|suddenly|gasp)\b/i.test(blob)) {
    pauseBiasMs += 30
    subtitleRevealBias = 0.85
  }

  return {
    speedMul: clamp(speedMul, 0.82, 1.14),
    pauseBiasMs: clamp(pauseBiasMs, 80, 320),
    emphasis,
    whisperBias: clamp(whisperBias, 0, 0.35),
    subtitleRevealBias: clamp(subtitleRevealBias, 0.75, 1.1)
  }
}

/** Client-side voice direction (preview + subtitle timing). */
export function buildVoiceDirection(ctx: VoiceDirectorContext): VoiceDirection & { profile: VoiceProfile } {
  const profile = buildVoiceProfile(ctx)
  const blob = `${ctx.narration || ''}\n${ctx.visualDescription || ''}`.toLowerCase()
  const dynamics = emotionDynamics(profile, blob)

  return {
    profile,
    instructionSuffix: '',
    ...dynamics
  }
}
