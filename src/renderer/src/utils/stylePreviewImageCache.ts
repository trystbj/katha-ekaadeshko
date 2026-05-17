import type { VisualStyleId } from '../types/story'
import { previewFrameSpecForStyle } from './stylePreviewFrames'

const KEY_PREFIX = 'katha_style_preview_v6:'

function key(styleId: VisualStyleId, customVisualPrompt?: string) {
  const base = styleId === 'custom' ? (customVisualPrompt ?? '').trim().slice(0, 160) : ''
  return `${KEY_PREFIX}${styleId}:${base}`
}

function safeJsonParse(s: string | null): unknown {
  if (!s) return null
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

type CacheEntry = { url: string; savedAt: string }

export function getCachedStylePreviewUrl(styleId: VisualStyleId, customVisualPrompt?: string): string | null {
  try {
    const raw = localStorage.getItem(key(styleId, customVisualPrompt))
    const parsed = safeJsonParse(raw) as CacheEntry | null
    const url = parsed?.url
    if (typeof url === 'string' && url.trim()) return url
    return null
  } catch {
    return null
  }
}

export async function generateStylePreviewUrl(styleId: VisualStyleId, customVisualPrompt?: string): Promise<string> {
  const spec = previewFrameSpecForStyle(styleId, customVisualPrompt)
  const res = await fetch('/api/leonardo-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: spec.prompt,
      width: 640,
      height: 1138,
      seed: spec.seed
    })
  })
  const text = await res.text()
  if (!res.ok) throw new Error(text || 'Preview generate failed')
  const out = JSON.parse(text) as { imageUrl?: string; url?: string; images?: string[]; image_url?: string }
  const url =
    out.imageUrl ||
    out.url ||
    out.image_url ||
    (Array.isArray(out.images) && out.images.length ? out.images[0] : null)
  if (!url || typeof url !== 'string') throw new Error('Invalid preview response')

  try {
    const entry: CacheEntry = { url, savedAt: new Date().toISOString() }
    localStorage.setItem(key(styleId, customVisualPrompt), JSON.stringify(entry))
  } catch {
    /* ignore */
  }
  return url
}

