import { probeSceneImageUrl } from './probeSceneImageUrl'
import { isPlaceholderSceneUrl } from './sceneImageValidationClient'

const failedUrls = new Set<string>()

export function markPreviewUrlFailed(url: string) {
  const u = String(url || '').trim()
  if (u) failedUrls.add(u)
}

export function isPreviewUrlFailed(url: string): boolean {
  return failedUrls.has(String(url || '').trim())
}

/** Returns empty string when URL is known-bad or fails probe (prevents black canvas). */
export async function validatedScenePreviewUrl(url: string | undefined): Promise<string> {
  const src = String(url || '').trim()
  if (!src || isPreviewUrlFailed(src)) return ''
  if (isPlaceholderSceneUrl(src)) return src
  const probe = await probeSceneImageUrl(src, 14_000)
  if (!probe.ok) {
    markPreviewUrlFailed(src)
    return ''
  }
  return src
}

export async function validatedScenePreviewUrls(urls: string[]): Promise<string[]> {
  const out: string[] = []
  for (const u of urls) {
    out.push(await validatedScenePreviewUrl(u))
  }
  return out
}
