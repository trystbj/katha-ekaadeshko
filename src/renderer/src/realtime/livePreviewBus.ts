/** Cross-panel live preview sync — scene edits bump revision for player + timeline. */

export type LivePreviewEvent =
  | { type: 'revision_bump'; sceneIndex?: number; reason?: string }
  | { type: 'seek_scene'; sceneIndex: number }
  | { type: 'playback_sync' }

type Listener = (ev: LivePreviewEvent) => void

const listeners = new Set<Listener>()

export function subscribeLivePreview(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function emitLivePreview(ev: LivePreviewEvent): void {
  for (const fn of listeners) fn(ev)
}

export function bumpLivePreview(sceneIndex?: number, reason?: string): void {
  emitLivePreview({ type: 'revision_bump', sceneIndex, reason })
}
