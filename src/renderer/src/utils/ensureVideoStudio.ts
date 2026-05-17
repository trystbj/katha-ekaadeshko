import type { ProjectState } from '../types/story'
import {
  defaultVideoStudioState,
  normalizeVideoStudioDraft,
  type VideoStudioState
} from '../types/videoStudio'
import { normalizeSubtitleStudio } from '../types/subtitleStudio'

/** Merge persisted video workspace + subtitle studio defaults for older projects. */
export function ensureVideoStudio(p: ProjectState): VideoStudioState {
  const guess = (p.bible?.title || p.title || '').trim()
  const raw = p.videoStudio ?? defaultVideoStudioState(guess)
  const subtitleStudio = normalizeSubtitleStudio(raw.subtitleStudio ?? undefined)
  return {
    ...raw,
    draft: normalizeVideoStudioDraft(raw.draft, guess),
    subtitleStudio
  }
}
