import type { CSSProperties } from 'react'
import type { SubtitleStudioState } from '../types/subtitleStudio'
import { hexToRgba, outlineShadow } from './buildSubtitleVttLook'
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

export function boxMetrics(
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
  const outline = outlineShadow(adv.outlineColor, adv.outlinePx)
  const soft =
    adv.shadowBlurPx > 0
      ? `0 ${Math.round(adv.shadowBlurPx * 0.35)}px ${adv.shadowBlurPx}px rgba(0,0,0,0.55)`
      : ''
  const glow = adv.glowBlurPx > 0 ? `0 0 ${adv.glowBlurPx}px ${adv.glowColor}` : ''
  const shadows = [outline, soft, glow].filter(Boolean).join(', ')
  return shadows || '0 1px 3px rgba(0,0,0,0.55)'
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

/** Font px scales with resized subtitle box height × CC relative size. */
export function storyboardSubtitleFontPx(
  adv: SubtitleStudioState['advanced'],
  containerWidth: number,
  containerHeight: number
): number {
  const { heightPx } = boxMetrics(adv, containerWidth, containerHeight)
  const innerH = Math.max(20, heightPx - 12)
  const px = Math.round(innerH * 0.28 * (adv.fontSizePct / 100))
  return Math.min(48, Math.max(11, px))
}

/** Cinematic text — size follows box resize handles and fontSizePct. */
export function storyboardSubtitleTextStyle(
  studio: SubtitleStudioState,
  containerWidth: number,
  containerHeight: number
): CSSProperties {
  const adv = studio.advanced
  const fontPx = storyboardSubtitleFontPx(adv, containerWidth, containerHeight)

  return {
    fontFamily: FONT_STACKS[adv.fontCategory],
    fontSize: `${fontPx}px`,
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
    opacity: 1,
    backgroundColor: hexToRgba(studio.advanced.bgColor, bgAlpha),
    borderRadius: studio.advanced.roundedBoxPx > 0 ? `${studio.advanced.roundedBoxPx}px` : '4px',
    backdropFilter: studio.advanced.backdropBlurPx > 0 ? `blur(${studio.advanced.backdropBlurPx}px)` : undefined
  }
}
