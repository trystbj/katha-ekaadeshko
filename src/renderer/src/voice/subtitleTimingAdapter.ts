import type { StoryScene } from '../types/story'
import type { SubtitleCue } from '../utils/scenesWebVtt'
import { buildVoiceDirection, type VoiceDirectorContext } from './voiceDirector'

/** Per-scene slideshow duration (ms) adjusted by voice director emotion/pacing. */
export function sceneDurationMsForVoice(
  baseMs: number,
  scene: StoryScene,
  _sceneIndex: number,
  ctx?: VoiceDirectorContext
): number {
  if (!ctx || ctx.autoVoiceDirector === false) return baseMs
  const body = (scene.text ?? '').trim()
  const dir = buildVoiceDirection({
    ...ctx,
    narration: body,
    visualDescription: scene.visualDescription
  })
  const pausePad = Math.round(dir.pauseBiasMs * 0.35)
  return Math.round(baseMs * dir.subtitleRevealBias + pausePad)
}

/** Extra subtitle lead-in (ms) for dramatic pauses. */
export function sceneSubtitleLeadInMs(ctx: VoiceDirectorContext | undefined, narration: string): number {
  if (!ctx || ctx.autoVoiceDirector === false) return 0
  const dir = buildVoiceDirection({ ...ctx, narration })
  return Math.round(dir.pauseBiasMs * 0.12)
}

/** Render payload subtitle rows (ms) from cues. */
export function cuesToRenderSubtitles(cues: SubtitleCue[]): { startMs: number; endMs: number; text: string }[] {
  return cues.map((c) => ({ startMs: c.startMs, endMs: c.endMs, text: c.body }))
}
