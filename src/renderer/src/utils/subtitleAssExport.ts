import type { SubtitleCue } from './scenesWebVtt'
import type { SubtitleStudioState } from '../types/subtitleStudio'
import { freePositionToPixelCoords, resolveSubtitleFreePosition } from './subtitleFreePosition'

function assTime(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const cs = Math.floor((ms % 1000) / 10)
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

function assColor(hex: string, alpha = 0): string {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i)
  if (!m) return '&H00FFFFFF'
  const n = parseInt(m[1], 16)
  const b = n & 255
  const g = (n >> 8) & 255
  const r = (n >> 16) & 255
  const a = Math.min(255, Math.max(0, Math.round(alpha)))
  return `&H${a.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${r.toString(16).padStart(2, '0')}`
}

function escapeAssText(raw: string): string {
  return raw.replace(/\r?\n/g, '\\N').replace(/{/g, '').replace(/}/g, '')
}

/**
 * ASS subtitles for FFmpeg burn-in — matches free X/Y preview coordinates.
 */
export function buildAssFromCues(
  cues: SubtitleCue[],
  studio: SubtitleStudioState,
  playResX: number,
  playResY: number
): string {
  const pos = resolveSubtitleFreePosition(studio)
  const { x, y } = freePositionToPixelCoords(pos, playResX, playResY)
  const adv = studio.advanced
  const fontSize = Math.round(42 * (adv.fontSizePct / 100))
  const lines: string[] = [
    '[Script Info]',
    'Title: Katha Subtitles',
    'ScriptType: v4.00+',
    `PlayResX: ${playResX}`,
    `PlayResY: ${playResY}`,
    'WrapStyle: 0',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: Default,Arial,${fontSize},${assColor(adv.textColor)},${assColor(adv.textColor)},${assColor(adv.outlineColor)},${assColor(adv.bgColor, Math.round(adv.bgOpacity * 255))},${adv.fontWeight >= 700 ? -1 : 0},0,0,0,100,100,0,0,1,${Math.max(0, adv.outlinePx)},${Math.max(0, Math.round(adv.shadowBlurPx / 4))},5,40,40,40,1`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text'
  ]

  cues.forEach((cue) => {
    const body = escapeAssText(cue.body)
    if (!body) return
    lines.push(
      `Dialogue: 0,${assTime(cue.startMs)},${assTime(cue.endMs)},Default,,0,0,0,,{\\an5\\pos(${x},${y})}${body}`
    )
  })

  return lines.join('\n')
}
