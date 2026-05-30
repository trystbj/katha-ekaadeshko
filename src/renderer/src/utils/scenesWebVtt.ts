import type { StoryScene } from '../types/story'
import type { SubtitleVttRenderOptions } from '../constants/subtitlePlaybackPresets'
import type { SubtitleStudioState } from '../types/subtitleStudio'
import type { PerSceneTimingOverride } from '../../../../core/engines/timeline/types'
import type { VoiceDirectorContext } from '../voice/voiceDirector'
import { sceneDurationMsForVoice, sceneSubtitleLeadInMs } from '../voice/subtitleTimingAdapter'

/** Must match `secondsPerImage` sent to `/api/render` in App (worker slideshow timing). */
export const SECONDS_PER_RENDER_SCENE = 4

export type SubtitleCue = { startMs: number; endMs: number; body: string; sceneIndex: number }

export interface SubtitleTimingInput {
  delayMs: number
  sceneOffsetsMs: number[]
  splitLongLines: boolean
  maxCharsPerLine: number
  karaokeMode: 'off' | 'pulse'
}

export const DEFAULT_SUBTITLE_TIMING: SubtitleTimingInput = {
  delayMs: 0,
  sceneOffsetsMs: [],
  splitLongLines: false,
  maxCharsPerLine: 42,
  karaokeMode: 'off'
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function formatVttTimestamp(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const frac = ms % 1000
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}.${String(frac).padStart(3, '0')}`
}

function formatSrtTimestamp(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const frac = ms % 1000
  return `${pad2(h)}:${pad2(m)}:${pad2(s)},${String(frac).padStart(3, '0')}`
}

export function escapeCueText(raw: string): string {
  return raw
    .replace(/\r?\n/g, ' ')
    .replace(/</g, '')
    .replace(/&/g, '&amp;')
    .trim()
}

export function splitSubtitleLines(body: string, maxChars: number): string[] {
  const lim = Math.max(12, Math.floor(maxChars))
  if (body.length <= lim) return [body]
  const words = body.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (next.length <= lim) cur = next
    else {
      if (cur) lines.push(cur)
      cur = w.length > lim ? w.slice(0, lim) : w
    }
  }
  if (cur) lines.push(cur)
  return lines.length ? lines : [body]
}

function scenePrimaryBody(s: StoryScene): string {
  let b = (s.text ?? '').trim()
  if (!b && s.narrationText?.trim()) {
    const parts = [s.narrationText.trim()]
    for (const d of s.dialogueLines ?? []) {
      if (!d.line.trim()) continue
      const who = d.character.trim()
      parts.push(who ? `${who} said, "${d.line.trim()}"` : `"${d.line.trim()}"`)
    }
    b = parts.join('\n\n').trim()
  }
  if (s.emoji?.trim()) b = `${b} ${s.emoji.trim()}`.trim()
  return b
}

function paddedSceneOffsets(offsets: number[], sceneCount: number): number[] {
  const base = offsets.slice(0, sceneCount)
  while (base.length < sceneCount) base.push(0)
  return base
}

function cueTailForScene(
  look: SubtitleVttRenderOptions,
  studio: SubtitleStudioState | null | undefined,
  sceneIndex: number
): string {
  const override = studio?.scenePositionsByIndex?.[sceneIndex]
  const linePct = override?.positionYPct ?? look.linePct
  const positionPct = override?.positionXPct ?? look.positionPct ?? 50
  return ` line:${linePct}% position:${positionPct}% align:${look.align} size:${look.sizePct}%`
}

function appendWebVttStyle(lines: string[], style: SubtitleVttRenderOptions) {
  lines.push('', 'STYLE')
  lines.push('::cue {')
  for (const row of style.cueStyleLines) {
    const trimmed = row.trim()
    if (!trimmed) continue
    lines.push(trimmed.endsWith(';') ? trimmed : `${trimmed};`)
  }
  lines.push('}', '')
}

/** Build timed cues from scenes (aligned with render slideshow pace). */
export function collectSubtitleCues(
  scenes: StoryScene[],
  secondsPerScene: number,
  timing: SubtitleTimingInput,
  bodyForScene: (scene: StoryScene, index: number) => string,
  voiceContext?: VoiceDirectorContext,
  planTiming?: PerSceneTimingOverride[]
): SubtitleCue[] {
  const cues: SubtitleCue[] = []
  const baseStep = Math.max(1, secondsPerScene) * 1000
  const offsets = paddedSceneOffsets(timing.sceneOffsetsMs, scenes.length)
  let wall = 0

  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i]
    const planRow = planTiming?.[i]
    const step = planRow?.durationMs ?? sceneDurationMsForVoice(baseStep, s, i, voiceContext)
    const rawBody = bodyForScene(s, i)
    const leadIn = planRow?.subtitleLeadInMs ?? sceneSubtitleLeadInMs(voiceContext, rawBody)
    const wallStart = wall + timing.delayMs + (offsets[i] ?? 0) + leadIn

    if (!rawBody) {
      wall += step
      continue
    }

    const body = escapeCueText(rawBody)
    if (!body) {
      wall += step
      continue
    }

    const sceneStep = step

    if (timing.karaokeMode === 'pulse') {
      const words = body.split(/\s+/).filter(Boolean)
      const n = Math.max(1, words.length)
      const wdur = sceneStep / n
      for (let w = 0; w < words.length; w++) {
        const startMs = wallStart + Math.round(w * wdur)
        const endMs = wallStart + Math.round((w + 1) * wdur)
        cues.push({ startMs, endMs, body: words[w]!, sceneIndex: i })
      }
    } else if (timing.splitLongLines) {
      const chunks = splitSubtitleLines(body, timing.maxCharsPerLine)
      const chunkDur = sceneStep / Math.max(1, chunks.length)
      chunks.forEach((chunk, j) => {
        const startMs = wallStart + Math.round(j * chunkDur)
        const endMs = wallStart + Math.round((j + 1) * chunkDur)
        cues.push({ startMs, endMs, body: chunk, sceneIndex: i })
      })
    } else {
      cues.push({ startMs: wallStart, endMs: wallStart + sceneStep, body, sceneIndex: i })
    }

    wall += sceneStep
  }

  return cues
}

export function cuesFromStudioPrimary(
  scenes: StoryScene[],
  secondsPerScene: number,
  studio: SubtitleStudioState,
  voiceContext?: VoiceDirectorContext,
  planTiming?: PerSceneTimingOverride[]
): SubtitleCue[] {
  const timing: SubtitleTimingInput = {
    delayMs: studio.delayMs,
    sceneOffsetsMs: studio.sceneOffsetsMs,
    splitLongLines: studio.splitLongLines,
    maxCharsPerLine: studio.maxCharsPerLine,
    karaokeMode: studio.karaokeMode
  }
  return collectSubtitleCues(
    scenes,
    secondsPerScene,
    timing,
    (scene) => scenePrimaryBody(scene),
    voiceContext,
    planTiming
  )
}

export function cuesFromStudioSecondary(
  scenes: StoryScene[],
  secondsPerScene: number,
  studio: SubtitleStudioState
): SubtitleCue[] {
  const timing: SubtitleTimingInput = {
    delayMs: studio.delayMs,
    sceneOffsetsMs: studio.sceneOffsetsMs,
    splitLongLines: studio.splitLongLines,
    maxCharsPerLine: studio.maxCharsPerLine,
    karaokeMode: 'off'
  }
  return collectSubtitleCues(scenes, secondsPerScene, timing, (_s, i) => {
    const line = studio.dualLinesBySceneIndex[i]?.trim()
    return line ?? ''
  })
}

export function scenesToWebVttFromCues(cues: SubtitleCue[], vttLook: SubtitleVttRenderOptions | null, studio?: SubtitleStudioState | null): string {
  const lines: string[] = ['WEBVTT']
  if (vttLook) appendWebVttStyle(lines, vttLook)
  else lines.push('')

  cues.forEach((cue, idx) => {
    const cueTail = vttLook ? cueTailForScene(vttLook, studio ?? null, cue.sceneIndex) : ''
    lines.push(
      String(idx + 1),
      `${formatVttTimestamp(cue.startMs)} --> ${formatVttTimestamp(cue.endMs)}${cueTail}`,
      cue.body,
      ''
    )
  })

  return lines.join('\n')
}

/** Build WebVTT from episode scenes (same order / duration as render queue / voiceover pacing). */
export function scenesToWebVtt(
  scenes: StoryScene[],
  secondsPerScene = SECONDS_PER_RENDER_SCENE,
  vttLook?: SubtitleVttRenderOptions | null,
  studio?: SubtitleStudioState | null,
  voiceContext?: VoiceDirectorContext,
  planTiming?: PerSceneTimingOverride[]
): string {
  const cues =
    studio != null
      ? cuesFromStudioPrimary(scenes, secondsPerScene, studio, voiceContext, planTiming)
      : collectSubtitleCues(
          scenes,
          secondsPerScene,
          DEFAULT_SUBTITLE_TIMING,
          (scene) => scenePrimaryBody(scene),
          voiceContext,
          planTiming
        )
  return scenesToWebVttFromCues(cues, vttLook ?? null, studio ?? null)
}

export function scenesSecondaryToWebVtt(
  scenes: StoryScene[],
  secondsPerScene: number,
  vttLook: SubtitleVttRenderOptions | null,
  studio: SubtitleStudioState
): string | null {
  const cues = cuesFromStudioSecondary(scenes, secondsPerScene, studio).filter((c) => c.body.length > 0)
  if (!cues.length) return null
  return scenesToWebVttFromCues(cues, vttLook, studio)
}

export function scenesToSrt(
  scenes: StoryScene[],
  secondsPerScene = SECONDS_PER_RENDER_SCENE,
  studio?: SubtitleStudioState | null
): string {
  const cues =
    studio != null
      ? cuesFromStudioPrimary(scenes, secondsPerScene, studio)
      : collectSubtitleCues(scenes, secondsPerScene, DEFAULT_SUBTITLE_TIMING, (scene) => scenePrimaryBody(scene))
  const lines: string[] = []
  cues.forEach((cue, idx) => {
    lines.push(String(idx + 1), `${formatSrtTimestamp(cue.startMs)} --> ${formatSrtTimestamp(cue.endMs)}`, cue.body, '')
  })
  return lines.join('\n')
}
