/**
 * Structured pipeline logging for traceable generation stages.
 */

export function pipelineStageLog(stage, meta = {}) {
  const payload =
    meta && typeof meta === 'object' && !Array.isArray(meta)
      ? { stage, ...meta }
      : { stage, detail: meta }
  console.info('[katha:pipeline]', stage, payload)
}

export function isStrictImagePipeline() {
  return process.env.KATHA_STRICT_PIPELINE !== '0'
}
