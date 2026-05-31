/**
 * Advanced subtitle/caption studio (post-render) — persisted on `VideoStudioState.subtitleStudio`.
 */
import {
  clampSubtitlePosition,
  freePositionFromPreset,
  DEFAULT_SUBTITLE_POSITION
} from '../utils/subtitleFreePosition'

export type SubtitleFontCategory =
  | 'serif'
  | 'sans'
  | 'handwritten'
  | 'cinematic'
  | 'bold'
  | 'elegant'
  | 'playful'
  | 'traditional'
  | 'modern'
  | 'display'

export type SubtitlePositionPreset =
  | 'bottom_center'
  | 'bottom_left'
  | 'bottom_right'
  | 'center'
  | 'top_center'
  | 'top_left'
  | 'top_right'
  | 'floating_adaptive'
  | 'smart_scene'
  | 'custom_line'

export interface SubtitleStudioAdvanced {
  fontCategory: SubtitleFontCategory
  /** Scales WebVTT cue font-size % (70–160). */
  fontSizePct: number
  fontWeight: number
  fontStyle: 'normal' | 'italic'
  textAlign: 'start' | 'center' | 'end'
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize'
  letterSpacingEm: number
  lineHeight: number
  textColor: string
  useGradientText: boolean
  /** Reserved for UI preview; native text tracks use solid `textColor`. */
  gradientCss: string
  outlineColor: string
  outlinePx: number
  shadowBlurPx: number
  glowColor: string
  glowBlurPx: number
  bgColor: string
  bgOpacity: number
  /** Subtitle box width (% of preview width, 24–92) — horizontal resize handles. */
  boxWidthPct: number
  /** @deprecated Migrated to boxWidthPct — kept for older saves. */
  boxScaleXPct?: number
  /** Box height scale % (50–200) — vertical resize handles. */
  boxScaleYPct: number
  roundedBoxPx: number
  backdropBlurPx: number
  animation: 'none' | 'fade_in' | 'bounce' | 'slide' | 'typewriter'
  /** Used when positionPreset === custom_line */
  customLinePct: number
}

export interface SubtitleStudioState {
  subtitlesOn: boolean
  burnInExport: boolean
  separateTrackFormat: 'vtt' | 'srt'
  delayMs: number
  autoSyncScenes: boolean
  /** Per-scene start offset (ms), aligned with scene indices */
  sceneOffsetsMs: number[]
  splitLongLines: boolean
  maxCharsPerLine: number
  dualLangEnabled: boolean
  dualLangCode: string
  /** Optional secondary line per scene index for dual-language tracks */
  dualLinesBySceneIndex: Partial<Record<number, string>>
  karaokeMode: 'off' | 'pulse'
  /** Matches `SubtitlePlaybackPresetId` string */
  playbackPresetId: string
  /** @deprecated Legacy preset — migrated to positionXPct/positionYPct on load. */
  positionPreset: SubtitlePositionPreset
  /** Center anchor X (%), export-safe horizontal position. */
  positionXPct: number
  /** Center anchor Y (%), export-safe vertical position. */
  positionYPct: number
  /** Reserved: per-scene overrides (scene index → position). */
  scenePositionsByIndex?: Partial<Record<number, { positionXPct: number; positionYPct: number }>>
  advanced: SubtitleStudioAdvanced
}

export function defaultSubtitleStudioAdvanced(): SubtitleStudioAdvanced {
  return {
    fontCategory: 'sans',
    fontSizePct: 100,
    fontWeight: 650,
    fontStyle: 'normal',
    textAlign: 'center',
    textTransform: 'none',
    letterSpacingEm: 0.02,
    lineHeight: 1.35,
    textColor: '#fafbff',
    useGradientText: false,
    gradientCss: 'linear-gradient(90deg,#fff8e8,#f6d365)',
    outlineColor: '#0a0a0a',
    outlinePx: 2,
    shadowBlurPx: 14,
    glowColor: 'rgba(251,191,36,0.45)',
    glowBlurPx: 12,
    bgColor: '#060810',
    bgOpacity: 0,
    boxWidthPct: 72,
    boxScaleYPct: 100,
    roundedBoxPx: 10,
    backdropBlurPx: 0,
    animation: 'none',
    customLinePct: 88
  }
}

export function defaultSubtitleStudioState(): SubtitleStudioState {
  return {
    subtitlesOn: true,
    burnInExport: false,
    separateTrackFormat: 'vtt',
    delayMs: 0,
    autoSyncScenes: true,
    sceneOffsetsMs: [],
    splitLongLines: true,
    maxCharsPerLine: 42,
    dualLangEnabled: false,
    dualLangCode: 'en',
    dualLinesBySceneIndex: {},
    karaokeMode: 'off',
    playbackPresetId: 'cinematic_gold',
    positionPreset: 'bottom_center',
    positionXPct: 50,
    positionYPct: 88,
    scenePositionsByIndex: {},
    advanced: defaultSubtitleStudioAdvanced()
  }
}

/** Pad / trim offsets array to scene count */
export function subtitleOffsetsForSceneCount(st: SubtitleStudioState, sceneCount: number): number[] {
  const base = Array.isArray(st.sceneOffsetsMs) ? st.sceneOffsetsMs.slice(0, sceneCount) : []
  while (base.length < sceneCount) base.push(0)
  return base
}

export function normalizeSubtitleStudio(
  raw: Partial<SubtitleStudioState> | SubtitleStudioState | undefined
): SubtitleStudioState {
  const def = defaultSubtitleStudioState()
  if (!raw) return def
  const advancedRaw = { ...def.advanced, ...(raw.advanced ?? {}) }
  const boxWidthPct = Math.min(
    92,
    Math.max(
      24,
      Number.isFinite(advancedRaw.boxWidthPct)
        ? advancedRaw.boxWidthPct
        : advancedRaw.boxScaleXPct ?? def.advanced.boxWidthPct
    )
  )
  const advanced = { ...advancedRaw, boxWidthPct, boxScaleXPct: undefined }
  const merged: SubtitleStudioState = {
    ...def,
    ...raw,
    playbackPresetId: typeof raw.playbackPresetId === 'string' ? raw.playbackPresetId : def.playbackPresetId,
    advanced,
    sceneOffsetsMs: Array.isArray(raw.sceneOffsetsMs) ? [...raw.sceneOffsetsMs] : def.sceneOffsetsMs,
    dualLinesBySceneIndex:
      raw.dualLinesBySceneIndex && typeof raw.dualLinesBySceneIndex === 'object'
        ? { ...raw.dualLinesBySceneIndex }
        : {},
    scenePositionsByIndex:
      raw.scenePositionsByIndex && typeof raw.scenePositionsByIndex === 'object'
        ? { ...raw.scenePositionsByIndex }
        : def.scenePositionsByIndex
  }
  const hasX = Number.isFinite(merged.positionXPct)
  const hasY = Number.isFinite(merged.positionYPct)
  if (!hasX || !hasY) {
    const migrated = freePositionFromPreset(merged.positionPreset, advanced.customLinePct)
    merged.positionXPct = migrated.positionXPct
    merged.positionYPct = migrated.positionYPct
  } else {
    const clamped = clampSubtitlePosition(merged.positionXPct, merged.positionYPct)
    merged.positionXPct = clamped.positionXPct
    merged.positionYPct = clamped.positionYPct
  }
  return merged
}

export function resetSubtitleFreePosition(): Pick<SubtitleStudioState, 'positionXPct' | 'positionYPct'> {
  return { ...DEFAULT_SUBTITLE_POSITION }
}
