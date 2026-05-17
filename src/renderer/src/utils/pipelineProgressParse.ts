/** Extract scene slice progress from worker/SSE stage strings, e.g. `image 3/11`. */
export function parsePipelineSceneSlice(stage: string): { current: number; total: number } | null {
  if (!stage) return null
  const m = stage.match(/image\s*(\d+)\s*\/\s*(\d+)/i)
  if (m) return { current: Number(m[1]), total: Number(m[2]) }
  return null
}

export type RenderSpeedTone = 'steady' | 'ahead' | 'behind'

/** Compare progress velocity vs linear expectation for a human-readable hint. */
export function renderSpeedTone(params: {
  progress: number
  elapsedSec: number
  prevSample: { p: number; t: number } | null
}): RenderSpeedTone {
  const { progress, elapsedSec, prevSample } = params
  if (progress < 2 || elapsedSec < 0.8) return 'steady'
  const expectedRate = progress / Math.max(elapsedSec, 0.001)
  if (!prevSample || elapsedSec - prevSample.t < 0.45) return 'steady'
  const instantRate = (progress - prevSample.p) / Math.max(elapsedSec - prevSample.t, 0.001)
  if (instantRate > expectedRate * 1.35) return 'ahead'
  if (instantRate < expectedRate * 0.55 && progress < 92) return 'behind'
  return 'steady'
}
