/**
 * Advanced subtitle/caption studio (post-render) — persisted on `VideoStudioState.subtitleStudio`.
 */

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
  positionPreset: SubtitlePositionPreset
  advanced: SubtitleStudioAdvanced
}

export function defaultSubtitleStudioAdvanced(): SubtitleStudioAdvanced {
  return {
    fontCategory: 'sans',
    fontSizePct: 100,
    fontWeight: 650,
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
    bgOpacity: 0.62,
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
  return {
    ...def,
    ...raw,
    playbackPresetId: typeof raw.playbackPresetId === 'string' ? raw.playbackPresetId : def.playbackPresetId,
    advanced: { ...def.advanced, ...(raw.advanced ?? {}) },
    sceneOffsetsMs: Array.isArray(raw.sceneOffsetsMs) ? [...raw.sceneOffsetsMs] : def.sceneOffsetsMs,
    dualLinesBySceneIndex:
      raw.dualLinesBySceneIndex && typeof raw.dualLinesBySceneIndex === 'object'
        ? { ...raw.dualLinesBySceneIndex }
        : {}
  }
}
