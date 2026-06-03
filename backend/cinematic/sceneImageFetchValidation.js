/**
 * Remote image URL validation — fetch, format, size, basic integrity (no black-frame without decode libs).
 */

const IMAGE_MAGIC = [
  { type: 'image/png', check: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { type: 'image/jpeg', check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: 'image/webp', check: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 }
]

const MIN_BYTES = 8_000
const MAX_BYTES = 12 * 1024 * 1024
const FETCH_TIMEOUT_MS = 20_000

function detectMime(buf) {
  if (!buf?.length) return null
  for (const m of IMAGE_MAGIC) {
    if (m.check(buf)) return m.type
  }
  return null
}

/**
 * @param {string} imageUrl
 * @returns {Promise<{ ok: boolean, issues: string[], bytes?: number, mime?: string }>}
 */
export async function validateRemoteSceneImageUrl(imageUrl) {
  const url = String(imageUrl || '').trim()
  const issues = []
  if (!url) {
    return { ok: false, issues: ['missing_image_url'] }
  }
  if (!/^https?:\/\//i.test(url)) {
    return { ok: false, issues: ['invalid_image_url_scheme'] }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'image/*' }
    })
    if (!res.ok) {
      issues.push(`http_${res.status}`)
      return { ok: false, issues }
    }
    const cl = Number(res.headers.get('content-length'))
    if (Number.isFinite(cl) && cl > 0 && cl < MIN_BYTES) {
      issues.push('content_too_small')
      return { ok: false, issues, bytes: cl }
    }
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < MIN_BYTES) {
      issues.push('body_too_small')
      return { ok: false, issues, bytes: buf.length }
    }
    if (buf.length > MAX_BYTES) {
      issues.push('body_too_large')
      return { ok: false, issues, bytes: buf.length }
    }
    const mime = detectMime(buf)
    if (!mime) {
      issues.push('unrecognized_image_format')
      return { ok: false, issues, bytes: buf.length }
    }
    const ct = String(res.headers.get('content-type') || '').toLowerCase()
    if (ct && !ct.includes('image') && !ct.includes('octet-stream')) {
      issues.push('unexpected_content_type')
      return { ok: false, issues, bytes: buf.length, mime }
    }
    return { ok: true, issues: [], bytes: buf.length, mime }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (/abort/i.test(msg)) issues.push('fetch_timeout')
    else issues.push('fetch_failed')
    return { ok: false, issues }
  } finally {
    clearTimeout(timer)
  }
}
