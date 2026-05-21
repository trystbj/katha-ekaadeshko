import type { StreamRevealState } from '../store/useStudioStore'
import type { StoryScene } from '../types/story'
import { liveRevealPhaseKey } from './liveRevealDocument'

/** Story Monitor shows progress only while the screenplay is being written or revealed. */
export function isMonitorScriptGenerationPhase(
  busy: string | null | undefined,
  streamReveal: StreamRevealState | null | undefined
): boolean {
  return busy === 'generating' || Boolean(streamReveal)
}

/** Final cinematic timeline in Story Monitor (script committed, not mid-reveal). */
export function isMonitorCinematicStoryReady(
  sceneCount: number,
  busy: string | null | undefined,
  streamReveal: StreamRevealState | null | undefined
): boolean {
  return sceneCount > 0 && !isMonitorScriptGenerationPhase(busy, streamReveal)
}

/** Progressive scene count during stream reveal (no markdown mirror). */
export function revealedSceneCount(
  scenes: StoryScene[],
  streamReveal: StreamRevealState | null | undefined
): number {
  if (!scenes.length) return 0
  if (!streamReveal || streamReveal.fullDoc.length <= 0) return scenes.length
  const ratio = Math.min(1, streamReveal.visibleLen / streamReveal.fullDoc.length)
  if (ratio >= 0.995) return scenes.length
  const minVisible = 1
  const byProgress = Math.max(minVisible, Math.ceil(ratio * scenes.length))
  return Math.min(scenes.length, byProgress)
}

export function scenesForLiveScriptPanel(
  allScenes: StoryScene[],
  streamReveal: StreamRevealState | null | undefined
): StoryScene[] {
  if (!streamReveal) return allScenes
  return allScenes.slice(0, revealedSceneCount(allScenes, streamReveal))
}

export function activeNarrationSceneIndex(
  scenes: StoryScene[],
  streamReveal: StreamRevealState | null | undefined
): number {
  const visible = scenesForLiveScriptPanel(scenes, streamReveal)
  if (!visible.length) return 0
  return visible[visible.length - 1]?.index ?? visible[0].index
}

export function liveScriptPhaseKey(streamReveal: StreamRevealState | null | undefined): string {
  if (!streamReveal) return 'liveGenPhaseScript'
  return liveRevealPhaseKey(streamReveal.fullDoc, streamReveal.visibleLen)
}
