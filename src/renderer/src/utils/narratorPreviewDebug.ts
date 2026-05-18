/**
 * Client-side narrator preview diagnostics (dev or localStorage katha_preview_debug=1).
 */
const PREFIX = '[katha-narrator-preview]'

export function isNarratorPreviewDebug(): boolean {
  if (import.meta.env.DEV) return true
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem('katha_preview_debug') === '1'
  } catch {
    return false
  }
}

export function previewLog(event: string, meta?: Record<string, unknown>) {
  if (!isNarratorPreviewDebug()) return
  if (meta && Object.keys(meta).length > 0) {
    console.info(PREFIX, event, meta)
  } else {
    console.info(PREFIX, event)
  }
}

export function previewWarn(event: string, meta?: Record<string, unknown>) {
  console.warn(PREFIX, event, meta ?? '')
}
