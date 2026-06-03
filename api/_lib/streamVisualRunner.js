import { runKathaVisualPipeline } from '../../backend/orchestrator/kathaVisualPipeline.js'
import { createPipelineBudget, PipelineYieldError } from '../../backend/utils/pipelineBudget.js'

/**
 * Visual pipeline with partial result on cooperative yield (per-scene images preserved).
 */
export async function runStreamVisualPipeline(opts) {
  const budget = createPipelineBudget()
  const partial = { images: [], audio: [] }
  const onProgress = opts.onProgress
  const wrappedProgress = (p) => {
    if (p?.stage === 'scene_complete' && p?.image) {
      partial.images.push(p.image)
    }
    if (onProgress) onProgress(p)
  }
  try {
    return await runKathaVisualPipeline({ ...opts, onProgress: wrappedProgress, budget })
  } catch (e) {
    if (partial.images.length) {
      return {
        images: partial.images,
        audio: partial.audio,
        metadata: {
          pipelineYielded: true,
          pipelineCheckpoint: 'visuals_partial',
          pipelineResumable: true,
          scenesCompleted: partial.images.length,
          partialError: e instanceof Error ? e.message : String(e)
        }
      }
    }
    if (e instanceof PipelineYieldError) throw e
    throw e
  }
}
