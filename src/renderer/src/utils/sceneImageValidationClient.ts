import type { ProjectState } from '../types/story'
import { sceneUrlForIndex } from './sceneAssetMap'
import { probeSceneImageUrl, type SceneImageProbeResult } from './probeSceneImageUrl'

export type SceneImageRejectReason =
  | 'missing_url'
  | 'image_too_small'
  | 'image_too_dark'
  | 'image_nearly_black'
  | 'image_mostly_black'
  | 'image_transparent'
  | 'image_load_failed'
  | 'load_timeout'
  | 'placeholder_only'

const MIN_WIDTH = 32
const MIN_HEIGHT = 32
const MIN_AVG_LUMINANCE = 14
const NEAR_BLACK_AVG = 22
const BLACK_PIXEL_RATIO = 0.88

export function isPlaceholderSceneUrl(url: string): boolean {
  return /^data:image\/svg\+xml/i.test(String(url || '').trim())
}

/** Stricter client-side decode validation (black / empty / corrupt guard). */
export async function validateSceneImageUrl(
  url: string,
  timeoutMs = 18_000
): Promise<SceneImageProbeResult & { avgLuminance?: number }> {
  const src = String(url || '').trim()
  if (!src) return { ok: false, reason: 'missing_url' }
  return new Promise((resolve) => {
    const img = new Image()
    let settled = false
    const done = (r: SceneImageProbeResult & { avgLuminance?: number }) => {
      if (settled) return
      settled = true
      resolve(r)
    }
    const timer = window.setTimeout(() => done({ ok: false, reason: 'load_timeout' }), timeoutMs)
    img.onload = () => {
      window.clearTimeout(timer)
      const w = img.naturalWidth
      const h = img.naturalHeight
      if (w < MIN_WIDTH || h < MIN_HEIGHT) {
        done({ ok: false, reason: 'image_too_small' })
        return
      }
      try {
        const canvas = document.createElement('canvas')
        const cw = Math.min(96, w)
        const ch = Math.min(96, h)
        canvas.width = cw
        canvas.height = ch
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          done({ ok: true, avgLuminance: 128 })
          return
        }
        ctx.drawImage(img, 0, 0, cw, ch)
        const data = ctx.getImageData(0, 0, cw, ch).data
        let lumSum = 0
        let lumCount = 0
        let darkPixels = 0
        let transparentPixels = 0
        const pixels = cw * ch
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3]
          if (a < 12) {
            transparentPixels += 1
            continue
          }
          const lum = (data[i] + data[i + 1] + data[i + 2]) / 3
          lumSum += lum
          lumCount += 1
          if (lum < 10) darkPixels += 1
        }
        if (transparentPixels / pixels > 0.75) {
          done({ ok: false, reason: 'image_transparent' })
          return
        }
        const avg = lumCount > 0 ? lumSum / lumCount : 0
        const darkRatio = lumCount > 0 ? darkPixels / lumCount : 1
        if (darkRatio >= BLACK_PIXEL_RATIO) {
          done({ ok: false, reason: 'image_mostly_black', avgLuminance: avg })
          return
        }
        if (avg < MIN_AVG_LUMINANCE) {
          done({ ok: false, reason: 'image_too_dark', avgLuminance: avg })
          return
        }
        if (avg < NEAR_BLACK_AVG && darkRatio > 0.55) {
          done({ ok: false, reason: 'image_nearly_black', avgLuminance: avg })
          return
        }
        done({ ok: true, avgLuminance: avg })
      } catch {
        done({ ok: false, reason: 'image_load_failed' })
      }
    }
    img.onerror = () => {
      window.clearTimeout(timer)
      done({ ok: false, reason: 'image_load_failed' })
    }
    img.crossOrigin = 'anonymous'
    img.referrerPolicy = 'no-referrer'
    img.src = src
  })
}

export type SceneImageAuditRow = {
  scene: number
  url?: string
  ok: boolean
  reason?: string
}

export async function auditEpisodeSceneImages(
  project: ProjectState,
  episodeNumber: number
): Promise<{
  rows: SceneImageAuditRow[]
  missing: number[]
  invalid: number[]
  black: number[]
  allProblems: number[]
}> {
  const ep = project.episodes.find((e) => e.number === episodeNumber) ?? project.episodes[0]
  const scenes = ep?.scenes ?? []
  const rows: SceneImageAuditRow[] = []
  const missing: number[] = []
  const invalid: number[] = []
  const black: number[] = []

  for (const s of scenes) {
    const url = sceneUrlForIndex(project, s.index)
    if (!url) {
      missing.push(s.index)
      rows.push({ scene: s.index, ok: false, reason: 'missing_url' })
      continue
    }
    const v = await validateSceneImageUrl(url)
    rows.push({ scene: s.index, url, ok: v.ok, reason: v.reason })
    if (!v.ok) {
      invalid.push(s.index)
      if (
        v.reason === 'image_too_dark' ||
        v.reason === 'image_nearly_black' ||
        v.reason === 'image_mostly_black' ||
        v.reason === 'image_transparent'
      ) {
        black.push(s.index)
      }
    }
  }

  const allProblems = [...new Set([...missing, ...invalid])]
  return { rows, missing, invalid, black, allProblems }
}

export function episodeSceneScriptComplete(
  project: ProjectState,
  episodeNumber: number
): { complete: boolean; incompleteScenes: number[] } {
  const ep = project.episodes.find((e) => e.number === episodeNumber) ?? project.episodes[0]
  const incompleteScenes: number[] = []
  for (const s of ep?.scenes ?? []) {
    const text = String(s.narrationText || s.text || '').trim()
    const visual = String(s.visualDescription || '').trim()
    if (!text && !visual) incompleteScenes.push(s.index)
  }
  return { complete: incompleteScenes.length === 0, incompleteScenes }
}
