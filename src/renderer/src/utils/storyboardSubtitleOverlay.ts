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

/** Inline overlay styles for live storyboard subtitle preview (mirrors WebVTT look). */
export function storyboardSubtitleOverlayStyle(studio: SubtitleStudioState): CSSProperties {
  const look = buildSubtitleVttLook(studio)
  const adv = studio.advanced
  const fontSizeRem = Math.min(2.2, Math.max(0.75, (look.sizePct / 100) * 1.05 * (adv.fontSizePct / 100)))
  const pos = resolveSubtitleFreePosition(studio)

  return {
    ...storyboardSubtitlePositionStyle(pos),
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
    backgroundColor: `rgba(6, 8, 16, ${Math.min(0.92, adv.bgOpacity)})`,
    borderRadius: adv.roundedBoxPx > 0 ? `${adv.roundedBoxPx}px` : undefined,
    padding: '0.35em 0.65em',
    maxWidth: '92%',
    textAlign:
      adv.textAlign === 'start' ? 'left' : adv.textAlign === 'end' ? 'right' : ('center' as const)
  }
}
