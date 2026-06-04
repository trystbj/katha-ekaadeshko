/**
 * Client-side image load + decode checks (black-frame / broken URL guard).
 */

import { validateSceneImageUrl, type SceneImageProbeResult } from './sceneImageValidationClient'

export type { SceneImageProbeResult }

export async function probeSceneImageUrl(
  url: string,
  timeoutMs = 18_000
): Promise<SceneImageProbeResult> {
  return validateSceneImageUrl(url, timeoutMs)
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
    const probe = await validateSceneImageUrl(String(url))
    if (!probe.ok) {
      if (scene) failedScenes.push(scene)
      reasons.push(`scene ${scene}: ${probe.reason || 'invalid'}`)
    }
  }
  return { ok: failedScenes.length === 0, failedScenes, reasons }
}
