/** Blob URLs keyed by full preview request URL. Bust when PREVIEW_CACHE_GEN changes. */

export const PREVIEW_CACHE_GEN = 'v10-voices'

const blobUrls = new Map<string, string>()
const inflight = new Map<string, Promise<void>>()

function cacheKey(previewUrl: string) {
  return `${PREVIEW_CACHE_GEN}|${previewUrl}`
}

async function blobLooksLikeMp3(blob: Blob): Promise<boolean> {
  if (blob.size < 4) return false
  const a = new Uint8Array(await blob.slice(0, 4).arrayBuffer())
  if (a[0] === 0x49 && a[1] === 0x44 && a[2] === 0x33) return true
  if (a[0] === 0xff && (a[1] & 0xe0) === 0xe0) return true
  return false
}

export function getCachedNarratorPreviewBlobUrl(previewUrl: string): string | undefined {
  return blobUrls.get(cacheKey(previewUrl))
}

/** Drop in-memory preview blobs (e.g. after deploy). */
export function clearNarratorPreviewAudioCache() {
  for (const url of blobUrls.values()) {
    try {
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    }
  }
  blobUrls.clear()
  inflight.clear()
}

/**
 * Warm cache in background — safe to call repeatedly per narrator row mount.
 */
export function prefetchNarratorPreviewMp3(previewUrl: string): Promise<void> {
  const key = cacheKey(previewUrl)
  if (blobUrls.has(key)) return Promise.resolve()
  const pending = inflight.get(key)
  if (pending) return pending

  const work = (async () => {
    try {
      const r = await fetch(previewUrl, {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8' }
      })
      const ct = (r.headers.get('content-type') || '').toLowerCase()
      if (!r.ok || ct.includes('application/json') || ct.includes('text/html')) return

      const blob = await r.blob()
      if (blob.size < 64 || !(await blobLooksLikeMp3(blob))) return

      const url = URL.createObjectURL(blob)
      blobUrls.set(key, url)
    } finally {
      inflight.delete(key)
    }
  })()

  inflight.set(key, work)
  return work
}
