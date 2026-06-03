/**
 * Client-side image load + decode checks (black-frame / broken URL guard).
 */

export type SceneImageProbeResult = { ok: boolean; reason?: string }

export async function probeSceneImageUrl(
  url: string,
  timeoutMs = 18_000
): Promise<SceneImageProbeResult> {
  const src = String(url || '').trim()
  if (!src) return { ok: false, reason: 'missing_url' }

  return new Promise((resolve) => {
    const img = new Image()
    let settled = false
    const done = (r: SceneImageProbeResult) => {
      if (settled) return
      settled = true
      resolve(r)
    }
    const timer = window.setTimeout(() => done({ ok: false, reason: 'load_timeout' }), timeoutMs)
    img.onload = () => {
      window.clearTimeout(timer)
      const w = img.naturalWidth
      const h = img.naturalHeight
      if (w < 32 || h < 32) {
        done({ ok: false, reason: 'image_too_small' })
        return
      }
      try {
        const canvas = document.createElement('canvas')
        const cw = Math.min(64, w)
        const ch = Math.min(64, h)
        canvas.width = cw
        canvas.height = ch
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          done({ ok: true })
          return
        }
        ctx.drawImage(img, 0, 0, cw, ch)
        const data = ctx.getImageData(0, 0, cw, ch).data
        let lum = 0
        for (let i = 0; i < data.length; i += 4) {
          lum += data[i] + data[i + 1] + data[i + 2]
        }
        const avg = lum / (data.length / 4) / 3
        if (avg < 6) done({ ok: false, reason: 'image_too_dark' })
        else done({ ok: true })
      } catch {
        done({ ok: true })
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

export async function probeSceneImagesFromPipeline(
  images: { scene?: string | number; image_url?: string; imageUrl?: string }[]
): Promise<{ ok: boolean; failedScenes: number[]; reasons: string[] }> {
  const failedScenes: number[] = []
  const reasons: string[] = []
  for (const row of images) {
    const url = row.image_url || row.imageUrl
    const scene = Number(row.scene) || 0
    if (!url) {
      if (scene) failedScenes.push(scene)
      reasons.push(`scene ${scene}: missing_url`)
      continue
    }
    const probe = await probeSceneImageUrl(String(url))
    if (!probe.ok) {
      if (scene) failedScenes.push(scene)
      reasons.push(`scene ${scene}: ${probe.reason || 'invalid'}`)
    }
  }
  return { ok: failedScenes.length === 0, failedScenes, reasons }
}
