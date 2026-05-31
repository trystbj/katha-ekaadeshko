import type { CSSProperties } from 'react'
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

function boxMetrics(
  adv: SubtitleStudioState['advanced'],
  containerWidth: number,
  containerHeight: number
) {
  const widthPct = Math.min(92, Math.max(24, adv.boxWidthPct ?? adv.boxScaleXPct ?? 72))
  const heightPct = Math.min(
    48,
    Math.max(
      8,
      adv.boxHeightPct ??
        (adv.boxScaleYPct != null ? Math.round((adv.boxScaleYPct / 100) * 14) : 14)
    )
  )
  const widthPx = Math.max(120, Math.round((containerWidth * widthPct) / 100))
  const heightPx = Math.max(48, Math.round((containerHeight * heightPct) / 100))
  return { widthPx, heightPx }
}

function cinematicTextShadow(adv: SubtitleStudioState['advanced']): string | undefined {
  const parts = [
    adv.outlinePx > 0 ? `0 0 ${adv.outlinePx}px ${adv.outlineColor}` : '',
    adv.shadowBlurPx > 0 ? `0 2px ${adv.shadowBlurPx}px rgba(0,0,0,0.72)` : '',
    '0 1px 3px rgba(0,0,0,0.55)'
  ].filter(Boolean)
  return parts.length ? parts.join(', ') : undefined
}

/** Outer anchor — position only. */
export function storyboardSubtitleOuterStyle(studio: SubtitleStudioState): CSSProperties {
  return storyboardSubtitlePositionStyle(resolveSubtitleFreePosition(studio))
}

/** Subtitle box — explicit width and height (no scale transforms). */
export function storyboardSubtitleBoxStyle(
  studio: SubtitleStudioState,
  containerWidth: number,
  containerHeight: number
): CSSProperties {
  const { widthPx, heightPx } = boxMetrics(studio.advanced, containerWidth, containerHeight)
  return {
    width: `${widthPx}px`,
    minWidth: `${widthPx}px`,
    maxWidth: `${widthPx}px`,
    height: `${heightPx}px`,
    minHeight: `${heightPx}px`,
    maxHeight: `${heightPx}px`,
    boxSizing: 'border-box'
  }
}

/** Cinematic text — size from `--subtitle-font-px` on stage (stable across scenes). */
export function storyboardSubtitleTextStyle(studio: SubtitleStudioState): CSSProperties {
  const adv = studio.advanced

  return {
    fontFamily: FONT_STACKS[adv.fontCategory],
    fontSize: 'var(--subtitle-font-px, 1.05rem)',
    fontWeight: adv.fontWeight,
    fontStyle: adv.fontStyle === 'italic' ? 'italic' : undefined,
    letterSpacing: `${adv.letterSpacingEm}em`,
    lineHeight: adv.lineHeight,
    color: adv.textColor,
    textTransform: adv.textTransform === 'none' ? undefined : adv.textTransform,
    textShadow: cinematicTextShadow(adv),
    textAlign:
      adv.textAlign === 'start' ? 'left' : adv.textAlign === 'end' ? 'right' : ('center' as const),
    background: 'transparent',
    padding: 0,
    margin: 0,
    whiteSpace: 'normal',
    wordBreak: 'normal',
    overflowWrap: 'break-word',
    writingMode: 'horizontal-tb'
  }
}

/** Optional background — opacity slider only (0 = invisible plate). */
export function storyboardSubtitleBgStyle(studio: SubtitleStudioState): CSSProperties {
  const bgAlpha = Math.min(1, Math.max(0, studio.advanced.bgOpacity))
  if (bgAlpha <= 0) {
    return { opacity: 0, background: 'transparent' }
  }
  return {
    opacity: bgAlpha,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: studio.advanced.roundedBoxPx > 0 ? `${studio.advanced.roundedBoxPx}px` : '4px'
  }
}
