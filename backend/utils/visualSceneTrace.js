import { safeLog } from '../../api/_lib/log.js'

/**
 * Structured trace for scene image generation (prompt, response, URLs, status).
 * @param {string} event
 * @param {Record<string, unknown>} meta
 */
export function traceVisualScene(event, meta = {}) {
  const payload = {
    at: new Date().toISOString(),
    event,
    ...meta
  }
  console.info('[katha:visual-trace]', event, payload)
  if (meta.level === 'error' || meta.failed) {
    safeLog('warn', `visual_scene_${event}`, payload)
  }
}
