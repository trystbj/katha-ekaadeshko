import type { StoryEpisode } from '../types/story'
import type { CopilotScenePatch, RegenerationTarget } from '../types/creatorStudio'

export async function fetchCopilotPatches(
  command: string,
  sceneIndex: number,
  scenePlan: Record<string, unknown> | null
): Promise<{ patches: CopilotScenePatch[]; updatedScene: Record<string, unknown> | null }> {
  const res = await fetch('/api/creator-copilot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, sceneIndex, scenePlan: scenePlan ?? undefined })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function fetchRegenerationPlan(
  target: RegenerationTarget,
  sceneIndex: number,
  episode: StoryEpisode,
  opts?: { execute?: boolean; studioInput?: Record<string, unknown> }
) {
  const res = await fetch('/api/creator-scene-regenerate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      target,
      sceneIndex,
      episode,
      execute: opts?.execute === true,
      studioInput: opts?.studioInput
    })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{
    regenerationPlan: Record<string, unknown>
    execution?: Record<string, unknown>
  }>
}

export async function fetchQualityReport(episode: StoryEpisode) {
  const res = await fetch('/api/creator-quality', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ episode })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ report: { score: number; suggestions: Array<Record<string, unknown>> } }>
}
