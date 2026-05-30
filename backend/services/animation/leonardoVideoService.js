/**
 * Leonardo AI video / motion generation (render engine — policy from AI Director).
 */

import { isServerlessRuntime } from '../../utils/runtime.js'
import { leonardoDimensionsForAspectMode } from '../leonardoService.js'
import {
  parseLeonardoApiError,
  summarizeVideoFailures,
  humanizeVideoFailure
} from '../../utils/leonardoErrors.js'
import { imagePromptEnglishLockLine } from '../../../shared/outputLanguageLock.js'

const LEONARDO_API = 'https://cloud.leonardo.ai/api/rest/v1'
const VIDEO_MAX_ATTEMPTS = 2

function requireKey() {
  const key = process.env.LEONARDO_API_KEY
  if (!key) throw new Error('LEONARDO_API_KEY is missing')
  return key
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function resolutionForMode(generationMode, aspectMode) {
  const cinematic = generationMode !== 'fast'
  if (aspectMode === 'horizontal_16_9') {
    return cinematic ? 'RESOLUTION_720' : 'RESOLUTION_480'
  }
  return cinematic ? 'RESOLUTION_720' : 'RESOLUTION_480'
}

function motionPromptForScene(row, directives = {}) {
  const base = [
    row?.visual_description,
    row?.camera_direction,
    row?.character_actions,
    directives.cameraStyle,
    directives.motionIntensity ? `motion intensity ${directives.motionIntensity}` : ''
  ]
    .filter(Boolean)
    .join('. ')
  const motion = base.slice(0, 900) || 'Subtle cinematic camera movement, emotional atmosphere'
  return `${imagePromptEnglishLockLine()} ${motion}`.trim()
}

/**
 * Image-to-video for one Leonardo image id.
 */
async function createImageToVideo({ imageId, prompt, resolution, frameInterpolation }) {
  const key = requireKey()
  const res = await fetch(`${LEONARDO_API}/generations-image-to-video`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageType: 'GENERATED',
      isPublic: false,
      imageId,
      prompt,
      resolution,
      frameInterpolation: frameInterpolation !== false,
      promptEnhance: true
    })
  })
  const txt = await res.text()
  if (!res.ok) throw new Error(`Leonardo i2v ${res.status}: ${txt}`)
  const json = JSON.parse(txt)
  const jobId =
    json?.motionVideoGenerationJob?.generationId ||
    json?.generationId ||
    json?.sdGenerationJob?.generationId
  if (!jobId) throw new Error('Leonardo i2v: missing job id')
  return jobId
}

async function pollMotionJob(generationId) {
  const key = requireKey()
  const maxPollMs = isServerlessRuntime() ? 22_000 : 180_000
  const deadline = Date.now() + maxPollMs
  while (Date.now() < deadline) {
    await sleep(3000)
    const gRes = await fetch(`${LEONARDO_API}/generations/${generationId}`, {
      headers: { Authorization: `Bearer ${key}` }
    })
    if (!gRes.ok) continue
    const g = await gRes.json()
    const root = g?.generations_by_pk || g?.generation || g
    const status = root?.status
    const imgs = root?.generated_images
    const motionUrl =
      imgs?.[0]?.motionMP4URL ||
      root?.motionMP4URL ||
      root?.generated_video?.url ||
      root?.videoUrl
    if (status === 'COMPLETE' && motionUrl) return { videoUrl: motionUrl, generationId }
    if (status === 'FAILED') throw new Error('Leonardo motion: generation failed')
  }
  throw new Error('Leonardo motion: timeout — try fast mode or fewer scenes')
}

async function createAndPollVideo({ imageId, prompt, resolution, frameInterpolation }) {
  let lastErr = null
  for (let attempt = 1; attempt <= VIDEO_MAX_ATTEMPTS; attempt++) {
    try {
      const jobId = await createImageToVideo({ imageId, prompt, resolution, frameInterpolation })
      return await pollMotionJob(jobId)
    } catch (e) {
      lastErr = e
      const message = e instanceof Error ? e.message : String(e)
      console.warn('[katha:leonardo-video]', 'scene_retry', { attempt, message })
      if (attempt < VIDEO_MAX_ATTEMPTS && /timeout|ECONNRESET|fetch failed|5\d{2}/i.test(message)) {
        await sleep(1500 * attempt)
        continue
      }
      throw e
    }
  }
  throw lastErr || new Error('Leonardo motion: generation failed')
}

/**
 * @param {object} opts
 * @param {object[]} opts.script
 * @param {object[]} opts.images pipeline images { scene, image_url, leonardoImageId }
 * @param {object} opts.input
 * @param {object} opts.directives
 * @param {(p: object) => void} [opts.onProgress]
 */
export async function leonardoGenerateVideoForScript(opts = {}) {
  if (process.env.KATHA_DISABLE_LEONARDO === '1') return []
  if (process.env.KATHA_DISABLE_LEONARDO_VIDEO === '1') return []
  if (isServerlessRuntime() && process.env.KATHA_SERVERLESS_LEONARDO_VIDEO !== '1') return []
  if (!process.env.LEONARDO_API_KEY) return []

  const script = Array.isArray(opts.script) ? opts.script : []
  const images = Array.isArray(opts.images) ? opts.images : []
  const input = opts.input || {}
  const directives = opts.directives || {}
  const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null
  const mode = directives.generationMode === 'fast' ? 'fast' : 'cinematic'
  const resolution = resolutionForMode(mode, input.aspectMode)
  const frameInterpolation = mode === 'cinematic'

  const out = []
  const failures = []

  for (let i = 0; i < script.length; i++) {
    const row = script[i]
    const sceneNum = Number(row?.scene) > 0 ? Number(row.scene) : i + 1
    const img = images.find((im) => Number(im?.scene) === sceneNum)
    const imageId = img?.leonardoImageId
    if (!imageId) {
      failures.push({ scene: sceneNum, message: 'missing_leonardo_image_id' })
      continue
    }
    try {
      const prompt = motionPromptForScene(row, directives)
      const { videoUrl } = await createAndPollVideo({
        imageId,
        prompt,
        resolution,
        frameInterpolation
      })
      out.push({
        scene: sceneNum,
        video_url: videoUrl,
        prompt,
        status: 'complete',
        resolution,
        generationMode: mode
      })
    } catch (e) {
      const message = humanizeVideoFailure(e instanceof Error ? e.message : String(e))
      failures.push({ scene: sceneNum, message })
      console.warn('[katha:leonardo-video]', 'scene_failed', { scene: sceneNum, message })
    }
    if (onProgress) {
      onProgress({
        stage: 'video',
        progress: Math.round(((i + 1) / Math.max(1, script.length)) * 100),
        message: `Motion ${i + 1}/${script.length}`
      })
    }
  }

  if (failures.length) {
    console.warn('[katha:leonardo-video]', 'batch_partial', {
      ok: out.length,
      failed: failures.length
    })
  }
  if (!out.length && failures.length && process.env.LEONARDO_API_KEY) {
    throw new Error(summarizeVideoFailures(failures))
  }
  return out
}

export { leonardoDimensionsForAspectMode, resolutionForMode }
