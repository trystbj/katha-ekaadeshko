import type { SubtitleVttRenderOptions } from '../constants/subtitlePlaybackPresets'
import { subtitleVttOptionsForPreset } from '../constants/subtitlePlaybackPresets'
import type { SubtitlePositionPreset, SubtitleStudioState } from '../types/subtitleStudio'

const FONT_STACKS: Record<SubtitleStudioState['advanced']['fontCategory'], string> = {
  serif: 'Georgia, "Noto Serif Nepali", "Times New Roman", serif',
  sans: 'system-ui, "Segoe UI", "Noto Sans", "Noto Sans Devanagari", sans-serif',
  handwritten: '"Segoe Script", "Bradley Hand", "Comic Sans MS", cursive',
  cinematic: '"Segoe UI", "Arial Narrow", sans-serif',
  bold: 'Impact, "Arial Black", system-ui, sans-serif',
  elegant: '"Palatino Linotype", Palatino, "Book Antiqua", serif',
  playful: '"Comic Sans MS", "Trebuchet MS", system-ui, sans-serif',
  traditional: '"Noto Serif Nepali", Georgia, serif',
  modern: 'system-ui, "Helvetica Neue", Helvetica, Arial, sans-serif',
  display: '"Segoe UI Variable Display", system-ui, sans-serif'
}

function hexToRgba(hex: string, a: number): string {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i)
  if (!m) return `rgba(6, 8, 16, ${a})`
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

function outlineShadow(color: string, px: number): string {
  const p = Math.min(6, Math.max(0, Math.round(px)))
  if (p <= 0) return ''
  const c = color
  const dirs: [number, number][] = [
    [-p, -p],
    [p, -p],
    [p, p],
    [-p, p],
    [0, -p],
    [0, p],
    [-p, 0],
    [p, 0]
  ]
  return dirs.map(([x, y]) => `${x}px ${y}px 0 ${c}`).join(', ')
}

function mergeCueLineMap(baseLines: string[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const row of baseLines) {
    const idx = row.indexOf(':')
    if (idx <= 0) continue
    const key = row.slice(0, idx).trim()
    let val = row.slice(idx + 1).trim()
    val = val.endsWith(';') ? val.slice(0, -1).trim() : val
    map.set(key, val)
  }
  return map
}

export function positionToVttLayout(
  preset: SubtitlePositionPreset,
  customLinePct: number,
  baseAlign: SubtitleVttRenderOptions['align']
): Pick<SubtitleVttRenderOptions, 'linePct' | 'align'> {
  switch (preset) {
    case 'bottom_center':
      return { linePct: 88, align: 'center' }
    case 'bottom_left':
      return { linePct: 88, align: 'start' }
    case 'bottom_right':
      return { linePct: 88, align: 'end' }
    case 'center':
      return { linePct: 50, align: 'center' }
    case 'top_center':
      return { linePct: 12, align: 'center' }
    case 'top_left':
      return { linePct: 12, align: 'start' }
    case 'top_right':
      return { linePct: 12, align: 'end' }
    case 'floating_adaptive':
      return { linePct: 80, align: 'center' }
    case 'smart_scene':
      return { linePct: 86, align: baseAlign }
    case 'custom_line':
      return { linePct: Math.min(95, Math.max(5, Math.round(customLinePct))), align: 'center' }
    default:
      return { linePct: 88, align: 'center' }
  }
}

/** Compose WebVTT cue styling from playback preset + studio typography/color controls. */
export function buildSubtitleVttLook(studio: SubtitleStudioState): SubtitleVttRenderOptions {
  const base = subtitleVttOptionsForPreset(studio.playbackPresetId)
  const pos = positionToVttLayout(studio.positionPreset, studio.advanced.customLinePct, base.align)
  const adv = studio.advanced

  const fill = adv.textColor

  const bg = hexToRgba(adv.bgColor, Math.min(1, Math.max(0, adv.bgOpacity)))

  const outline = outlineShadow(adv.outlineColor, adv.outlinePx)
  const soft =
    adv.shadowBlurPx > 0 ? `0 ${Math.round(adv.shadowBlurPx * 0.35)}px ${adv.shadowBlurPx}px rgba(0,0,0,0.55)` : ''
  const glow =
    adv.glowBlurPx > 0 ? `0 0 ${adv.glowBlurPx}px ${adv.glowColor}` : ''

  const shadows = [outline, soft, glow].filter(Boolean).join(', ')
  const letterSpacing = `${adv.letterSpacingEm}em`

  const baseMap = mergeCueLineMap(base.cueStyleLines)
  baseMap.set('color', fill)
  baseMap.set('font-family', FONT_STACKS[adv.fontCategory])
  baseMap.set('font-size', `${Math.min(160, Math.max(52, Math.round(adv.fontSizePct)))}%`)
  baseMap.set('font-weight', String(adv.fontWeight))
  baseMap.set('letter-spacing', letterSpacing)
  baseMap.set('line-height', String(adv.lineHeight))
  baseMap.set('background-color', bg)
  baseMap.set('border-radius', `${Math.round(adv.roundedBoxPx)}px`)
  baseMap.set('padding', adv.roundedBoxPx > 0 ? '0.08em 0.35em' : '0')
  if (adv.backdropBlurPx > 0) {
    baseMap.set('backdrop-filter', `blur(${Math.round(adv.backdropBlurPx)}px)`)
  } else {
    baseMap.delete('backdrop-filter')
  }

  const tt =
    adv.textTransform === 'none'
      ? 'none'
      : adv.textTransform === 'uppercase'
        ? 'uppercase'
        : adv.textTransform === 'lowercase'
          ? 'lowercase'
          : 'capitalize'
  baseMap.set('text-transform', tt)

  if (shadows) baseMap.set('text-shadow', shadows)
  else baseMap.delete('text-shadow')

  const cueStyleLines = [...baseMap.entries()].map(([k, v]) => `${k}: ${v};`)

  const sizePct = Math.min(100, Math.max(48, Math.round(base.sizePct * (adv.fontSizePct / 100))))

  return {
    linePct: pos.linePct,
    align: pos.align,
    sizePct,
    cueStyleLines
  }
}
