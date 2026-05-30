import type { CSSProperties } from 'react'
import type { SubtitlePositionPreset, SubtitleStudioState } from '../types/subtitleStudio'
import type { AspectMode } from '../types/story'
import type { SubtitleVttRenderOptions } from '../constants/subtitlePlaybackPresets'

/** Export-safe margins (% of frame). Subtitle center anchor must stay inside. */
export const SUBTITLE_SAFE_AREA = {
  minX: 8,
  maxX: 92,
  minY: 8,
  maxY: 92
} as const

export const DEFAULT_SUBTITLE_POSITION = {
  positionXPct: 50,
  positionYPct: 88
} as const

export type SubtitleFreePosition = {
  positionXPct: number
  positionYPct: number
}

export function clampSubtitlePosition(x: number, y: number): SubtitleFreePosition {
  return {
    positionXPct: Math.min(SUBTITLE_SAFE_AREA.maxX, Math.max(SUBTITLE_SAFE_AREA.minX, Math.round(x))),
    positionYPct: Math.min(SUBTITLE_SAFE_AREA.maxY, Math.max(SUBTITLE_SAFE_AREA.minY, Math.round(y)))
  }
}

/** Legacy preset → normalized free coordinates (center anchor). */
export function freePositionFromPreset(
  preset: SubtitlePositionPreset,
  customLinePct = 88
): SubtitleFreePosition {
  switch (preset) {
    case 'top_center':
    case 'top_left':
    case 'top_right':
      return clampSubtitlePosition(50, 12)
    case 'center':
      return clampSubtitlePosition(50, 50)
    case 'bottom_left':
      return clampSubtitlePosition(18, 88)
    case 'bottom_right':
      return clampSubtitlePosition(82, 88)
    case 'floating_adaptive':
      return clampSubtitlePosition(50, 80)
    case 'custom_line':
      return clampSubtitlePosition(50, customLinePct)
    case 'smart_scene':
    case 'bottom_center':
    default:
      return clampSubtitlePosition(50, 88)
  }
}

export function resolveSubtitleFreePosition(studio: SubtitleStudioState): SubtitleFreePosition {
  const hasX = Number.isFinite(studio.positionXPct)
  const hasY = Number.isFinite(studio.positionYPct)
  if (hasX && hasY) {
    return clampSubtitlePosition(studio.positionXPct, studio.positionYPct)
  }
  return freePositionFromPreset(studio.positionPreset, studio.advanced.customLinePct)
}

export function storyboardSubtitlePositionStyle(pos: SubtitleFreePosition): CSSProperties {
  return {
    left: `${pos.positionXPct}%`,
    top: `${pos.positionYPct}%`,
    right: 'auto',
    bottom: 'auto',
    transform: 'translate(-50%, -50%)'
  }
}

export function freePositionToVttLayout(
  pos: SubtitleFreePosition,
  baseAlign: SubtitleVttRenderOptions['align']
): Pick<SubtitleVttRenderOptions, 'linePct' | 'align'> & { positionPct: number } {
  return {
    linePct: pos.positionYPct,
    positionPct: pos.positionXPct,
    align: baseAlign
  }
}

/**
 * Master encode canvas (worker scales/pads to 1920×1080).
 * Free X/Y % map to this frame so preview matches burn-in export.
 */
export function subtitleExportPlayRes(_aspectMode?: AspectMode): { playResX: number; playResY: number } {
  return { playResX: 1920, playResY: 1080 }
}

export function freePositionToPixelCoords(
  pos: SubtitleFreePosition,
  playResX: number,
  playResY: number
): { x: number; y: number } {
  return {
    x: Math.round((pos.positionXPct / 100) * playResX),
    y: Math.round((pos.positionYPct / 100) * playResY)
  }
}

const ARROW_NUDGE_PCT = 1

export function nudgeSubtitlePosition(
  pos: SubtitleFreePosition,
  key: string,
  shiftKey: boolean
): SubtitleFreePosition | null {
  const step = shiftKey ? ARROW_NUDGE_PCT * 4 : ARROW_NUDGE_PCT
  let { positionXPct, positionYPct } = pos
  switch (key) {
    case 'ArrowLeft':
      positionXPct -= step
      break
    case 'ArrowRight':
      positionXPct += step
      break
    case 'ArrowUp':
      positionYPct -= step
      break
    case 'ArrowDown':
      positionYPct += step
      break
    default:
      return null
  }
  return clampSubtitlePosition(positionXPct, positionYPct)
}

export function pointerToSubtitlePosition(
  clientX: number,
  clientY: number,
  rect: DOMRect
): SubtitleFreePosition {
  const x = ((clientX - rect.left) / Math.max(1, rect.width)) * 100
  const y = ((clientY - rect.top) / Math.max(1, rect.height)) * 100
  return clampSubtitlePosition(x, y)
}
