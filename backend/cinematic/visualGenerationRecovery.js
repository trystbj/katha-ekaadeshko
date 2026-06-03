/**
 * Visual generation result verification — mandatory steps before accepting images.
 */

import { validateRemoteSceneImageUrl } from './sceneImageFetchValidation.js'
import { pipelineStageLog } from '../utils/pipelineStageLog.js'

/**
 * @param {object} row — pipeline image row
 */
export async function verifyPipelineImageRow(row = {}) {
  const scene = Number(row.scene) || 0
  const url = String(row.image_url || row.imageUrl || '').trim()
  const steps = {
    hasUrl: Boolean(url),
    remoteOk: false,
    bytes: 0,
    mime: ''
  }
  if (!steps.hasUrl) {
    return { ok: false, scene, steps, reason: 'missing_image_url' }
  }
  const remote = await validateRemoteSceneImageUrl(url)
  steps.remoteOk = remote.ok
  steps.bytes = remote.bytes || 0
  steps.mime = remote.mime || ''
  if (!remote.ok) {
    pipelineStageLog('visual_recovery_failed', { scene, issues: remote.issues })
    return { ok: false, scene, steps, reason: remote.issues?.join(',') || 'download_failed' }
  }
  pipelineStageLog('visual_recovery_ok', { scene, bytes: steps.bytes, mime: steps.mime })
  return { ok: true, scene, steps }
}

/**
 * @param {object[]} images
 */
export async function verifyAllPipelineImages(images = []) {
  const results = []
  for (const row of images) {
    results.push(await verifyPipelineImageRow(row))
  }
  const failed = results.filter((r) => !r.ok)
  return {
    ok: failed.length === 0,
    results,
    failedScenes: failed.map((f) => f.scene).filter(Boolean),
    reasons: failed.map((f) => `scene ${f.scene}: ${f.reason}`)
  }
}

/**
 * @param {object} result — pipeline output
 */
export function normalizeVisualPipelineResult(result = {}) {
  const images = Array.isArray(result.images) ? result.images : []
  const audio = Array.isArray(result.audio) ? result.audio : []
  return {
    images: images.filter((r) => String(r?.image_url || r?.imageUrl || '').trim()),
    audio,
    metadata: result.metadata || {}
  }
}
