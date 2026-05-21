/**
 * Stage 2 — Visual + narration generation from approved script only.
 */

import { leonardoGenerateForScript } from '../services/leonardoService.js'
import { ttsGenerateForScript } from '../services/ttsService.js'
import { getRegionForCountry } from '../utils/regionData.js'
import { normalizePipelineInput } from '../utils/generationBlueprint.js'

/**
 * @param {object} opts
 * @param {object[]} opts.script full or filtered script rows
 * @param {object} opts.story story JSON (cast)
 * @param {object} opts.input studio fields (styleId, aspectMode, characterReference, …)
 * @param {import('http').IncomingMessage} [opts.req]
 * @param {(p: object) => void} [opts.onProgress]
 * @param {number[]} [opts.sceneIndices] 1-based scene numbers to generate; default all rows
 */
export async function runKathaVisualPipeline(opts = {}) {
  const input = normalizePipelineInput(opts.input || {})
  const region = getRegionForCountry(input.country)
  const scriptAll = Array.isArray(opts.script) ? opts.script : []
  const wanted = Array.isArray(opts.sceneIndices) ? new Set(opts.sceneIndices.map(Number)) : null

  const script = wanted?.size
    ? scriptAll.filter((row, i) => {
        const n = Number(row?.scene)
        const key = Number.isFinite(n) && n > 0 ? n : i + 1
        return wanted.has(key)
      })
    : scriptAll

  if (!script.length) {
    throw new Error('No script scenes to generate visuals for.')
  }

  const story = opts.story && typeof opts.story === 'object' ? opts.story : {}
  const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null

  if (onProgress) {
    onProgress({ stage: 'visuals', progress: 5, message: 'Starting cinematic visuals…' })
  }

  const [images, audio] = await Promise.all([
    leonardoGenerateForScript({
      script,
      input,
      region,
      onProgress,
      characters: story.characters || []
    }),
    ttsGenerateForScript({
      script,
      input,
      region,
      req: opts.req,
      story
    })
  ])

  if (onProgress) {
    onProgress({ stage: 'done', progress: 100, message: 'Visual generation complete' })
  }

  return {
    images: Array.isArray(images) ? images : [],
    audio: Array.isArray(audio) ? audio : [],
    metadata: {
      region,
      sceneCount: script.length,
      visualGeneration: true
    }
  }
}
