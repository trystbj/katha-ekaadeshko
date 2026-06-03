import { runKathaPipeline } from '../../backend/orchestrator/kathaPipeline.js'
import { PipelineYieldError, createPipelineBudget } from '../../backend/utils/pipelineBudget.js'
import { isServerlessRuntime } from '../../backend/utils/runtime.js'

/**
 * Run story pipeline with cooperative budget (no blind race that drops partial work).
 * @param {object} input
 * @param {import('http').IncomingMessage} req
 * @param {{ onProgress?: (p: object) => void }} opts
 */
export async function runStreamPipeline(input, req, opts = {}) {
  const budget = createPipelineBudget()
  const onProgress = opts.onProgress
  try {
    return await runKathaPipeline(input, req, { onProgress, budget })
  } catch (e) {
    if (e instanceof PipelineYieldError && e.partialResult) {
      return {
        ...e.partialResult,
        metadata: {
          ...(e.partialResult.metadata || {}),
          pipelineYielded: true,
          pipelineCheckpoint: e.checkpoint
        }
      }
    }
    if (isServerlessRuntime()) {
      const snap = budget.getCheckpoint()
      if (snap.story) {
        return {
          story: snap.story,
          script: Array.isArray(snap.script) ? snap.script : [],
          images: [],
          audio: [],
          metadata: {
            pipelineYielded: true,
            pipelineCheckpoint: snap.script?.length ? 'script_ready' : 'story_ready',
            pipelineResumable: true,
            ...(snap.masterStoryContext ? { masterStoryContext: snap.masterStoryContext } : {})
          }
        }
      }
    }
    throw e
  }
}
