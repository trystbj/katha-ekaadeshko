import {
  SUBTITLE_PLAYBACK_PRESETS,
  isSubtitlePlaybackPresetId,
  type SubtitlePlaybackPresetId
} from '../constants/subtitlePlaybackPresets'
import type { SubtitleStudioAdvanced, SubtitleStudioState } from '../types/subtitleStudio'

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

function expandHex(hex: string): string {
  if (hex.length === 3) {
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
  }
  return `#${hex}`
}

function parseCssColor(raw: string): { hex: string; opacity: number } | null {
  const t = raw.trim()
  if (!t || t === 'transparent') return { hex: '#000000', opacity: 0 }
  const hexMatch = t.match(/#([0-9a-f]{3,8})/i)
  if (hexMatch) return { hex: expandHex(hexMatch[1]), opacity: 1 }
  const rgbaMatch = t.match(/rgba?\(\s*([^)]+)\s*\)/i)
  if (!rgbaMatch) return null
  const parts = rgbaMatch[1].split(',').map((p) => p.trim())
  if (parts.length < 3) return null
  const r = Math.round(Number(parts[0]))
  const g = Math.round(Number(parts[1]))
  const b = Math.round(Number(parts[2]))
  const a = parts.length >= 4 ? Number(parts[3]) : 1
  if (![r, g, b].every(Number.isFinite)) return null
  const hex = `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`
  return { hex, opacity: Number.isFinite(a) ? Math.min(1, Math.max(0, a)) : 1 }
}

/** Map playback preset VTT cues into studio `advanced` + anchor position. */
export function advancedFromPlaybackPreset(
  presetId: SubtitlePlaybackPresetId,
  base: SubtitleStudioAdvanced
): SubtitleStudioAdvanced {
  const preset = SUBTITLE_PLAYBACK_PRESETS[presetId]
  const map = mergeCueLineMap(preset.vtt.cueStyleLines)
  const next: SubtitleStudioAdvanced = { ...base }

  const color = map.get('color')
  if (color) {
    const parsed = parseCssColor(color)
    if (parsed) next.textColor = parsed.hex
  }

  const bg = map.get('background-color')
  if (bg) {
    const parsed = parseCssColor(bg)
    if (parsed) {
      next.bgColor = parsed.hex
      next.bgOpacity = parsed.opacity
    }
  }

  const fs = map.get('font-size')
  if (fs) {
    const m = fs.match(/([\d.]+)\s*%/)
    if (m) next.fontSizePct = Math.min(160, Math.max(52, Math.round(Number(m[1]))))
  }

  const fw = map.get('font-weight')
  if (fw) {
    const n = Number(fw)
    if (Number.isFinite(n)) next.fontWeight = n
  }

  const ls = map.get('letter-spacing')
  if (ls) {
    const m = ls.match(/([\d.]+)\s*em/)
    if (m) next.letterSpacingEm = Number(m[1])
  }

  const lh = map.get('line-height')
  if (lh) {
    const n = Number(lh)
    if (Number.isFinite(n)) next.lineHeight = n
  }

  const ts = map.get('text-shadow') ?? ''
  if (ts && ts !== 'none') {
    if (/(-?\d+px\s+){3,}0\s+#/i.test(ts) || ts.includes('2px 2px 0')) {
      next.outlinePx = Math.max(next.outlinePx, 2)
      next.shadowBlurPx = 0
      next.glowBlurPx = 0
    } else if (ts.includes('0 0') && /\d+px/.test(ts)) {
      next.glowBlurPx = Math.max(next.glowBlurPx, 16)
      next.shadowBlurPx = Math.max(next.shadowBlurPx, 8)
    } else {
      next.shadowBlurPx = Math.max(next.shadowBlurPx, 12)
      next.outlinePx = Math.max(next.outlinePx, 1)
    }
  }

  if (next.fontWeight >= 800) next.fontCategory = 'bold'
  else if (presetId.includes('cinematic') || presetId.includes('movie')) next.fontCategory = 'cinematic'
  else if (presetId.includes('storybook') || presetId.includes('nepali')) next.fontCategory = 'traditional'

  return next
}

/** Full studio patch when user picks a Subtitle Look preset. */
export function subtitleStudioPatchForPlaybackPreset(
  studio: SubtitleStudioState,
  presetId: string
): Partial<SubtitleStudioState> {
  const id = isSubtitlePlaybackPresetId(presetId) ? presetId : studio.playbackPresetId
  const preset = SUBTITLE_PLAYBACK_PRESETS[id as SubtitlePlaybackPresetId]
  const advanced = advancedFromPlaybackPreset(id as SubtitlePlaybackPresetId, studio.advanced)
  const align = preset.vtt.align
  return {
    playbackPresetId: id,
    positionYPct: Math.min(95, Math.max(5, preset.vtt.linePct)),
    positionXPct: align === 'start' ? 18 : align === 'end' ? 82 : 50,
    advanced: {
      ...advanced,
      textAlign: align
    }
  }
}
