/** True on Vercel / gateway serverless (no long local I/O). */
export function isServerlessRuntime() {
  return process.env.VERCEL === '1' || process.env.KATHA_SERVERLESS === '1'
}

/** Wall-clock budget for full stream generate on serverless (under Vercel maxDuration). */
export function serverlessPipelineBudgetMs() {
  const n = Number(process.env.KATHA_STREAM_PIPELINE_MS)
  if (Number.isFinite(n) && n > 10_000) return Math.min(n, 58_000)
  return 58_000
}

/** Skip validate/enhance LLM round-trips on Vercel (saves ~20–40s). Set KATHA_SERVERLESS_FAST=0 to disable. */
export function serverlessFastPipeline() {
  if (!isServerlessRuntime()) return false
  if (process.env.KATHA_SERVERLESS_FAST === '0') return false
  return true
}

/** Per-LLM HTTP timeout — shorter on serverless so the stream can finish before Vercel kills the function. */
export function llmHttpTimeoutMs() {
  if (!isServerlessRuntime()) return 90_000
  const n = Number(process.env.KATHA_LLM_TIMEOUT_MS)
  if (Number.isFinite(n) && n >= 8_000) return Math.min(n, 45_000)
  return 22_000
}

export function llmHttpRetries() {
  return isServerlessRuntime() ? 1 : 2
}
