import type { CSSProperties } from 'react'
import { buildSubtitleVttLook } from './buildSubtitleVttLook'
import type { SubtitleStudioState } from '../types/subtitleStudio'
import { resolveSubtitleFreePosition, storyboardSubtitlePositionStyle } from './subtitleFreePosition'

const FONT_STACKS: Record<SubtitleStudioState['advanced']['fontCategory'], string> = {
  serif: 'Georgia, "Noto Serif Nepali", serif',
  sans: 'system-ui, "Segoe UI", sans-serif',
  handwritten: '"Segoe Script", cursive',
  cinematic: '"Segoe UI", "Arial Narrow", sans-serif',
  bold: 'Impact, "Arial Black", sans-serif',
  elegant: 'Palatino, serif',
  playful: '"Comic Sans MS", system-ui, sans-serif',
  traditional: '"Noto Serif Nepali", Georgia, serif',
  modern: 'system-ui, Helvetica, Arial, sans-serif',
  display: 'system-ui, sans-serif'
}

function boxScales(adv: SubtitleStudioState['advanced']) {
  const x = adv.boxScaleXPct ?? 100
  const y = adv.boxScaleYPct ?? 100
  return {
    boxScaleXPct: Math.min(200, Math.max(50, x)),
    boxScaleYPct: Math.min(200, Math.max(50, y))
  }
}

/** Outer anchor — position only (drag moves this). */
export function storyboardSubtitleOuterStyle(studio: SubtitleStudioState): CSSProperties {
  const pos = resolveSubtitleFreePosition(studio)
  return storyboardSubtitlePositionStyle(pos)
}

/** Text layer — always full opacity; not affected by background opacity slider. */
export function storyboardSubtitleTextStyle(studio: SubtitleStudioState): CSSProperties {
  const look = buildSubtitleVttLook(studio)
  const adv = studio.advanced
  const { boxScaleXPct, boxScaleYPct } = boxScales(adv)
  const fontSizeRem = Math.min(2.2, Math.max(0.75, (look.sizePct / 100) * 1.05 * (adv.fontSizePct / 100)))

  return {
    fontFamily: FONT_STACKS[adv.fontCategory],
    fontSize: `${fontSizeRem}rem`,
    fontWeight: adv.fontWeight,
    fontStyle: adv.fontStyle === 'italic' ? 'italic' : undefined,
    letterSpacing: `${adv.letterSpacingEm}em`,
    lineHeight: adv.lineHeight,
    color: adv.textColor,
    textTransform: adv.textTransform === 'none' ? undefined : adv.textTransform,
    textShadow: [
      adv.outlinePx > 0 ? `0 0 ${adv.outlinePx}px ${adv.outlineColor}` : '',
      adv.shadowBlurPx > 0 ? `0 2px ${adv.shadowBlurPx}px rgba(0,0,0,0.65)` : '',
      adv.glowBlurPx > 0 ? `0 0 ${adv.glowBlurPx}px ${adv.glowColor}` : ''
    ]
      .filter(Boolean)
      .join(', ') || undefined,
    transform: `scale(${boxScaleXPct / 100}, ${boxScaleYPct / 100})`,
    transformOrigin: 'center center',
    maxWidth: '92%',
    textAlign:
      adv.textAlign === 'start' ? 'left' : adv.textAlign === 'end' ? 'right' : ('center' as const)
  }
}

/** Background plate — opacity slider affects only this layer. */
export function storyboardSubtitleBgStyle(studio: SubtitleStudioState): CSSProperties {
  const adv = studio.advanced
  const bgAlpha = Math.min(1, Math.max(0, adv.bgOpacity))
  return {
    opacity: bgAlpha,
    backgroundColor: 'rgb(6, 8, 16)',
    borderRadius: adv.roundedBoxPx > 0 ? `${adv.roundedBoxPx}px` : undefined
  }
}

/** @deprecated Use split outer/text/bg styles */
export function storyboardSubtitleOverlayStyle(studio: SubtitleStudioState): CSSProperties {
  return {
    ...storyboardSubtitleOuterStyle(studio),
    ...storyboardSubtitleTextStyle(studio)
  }
}
