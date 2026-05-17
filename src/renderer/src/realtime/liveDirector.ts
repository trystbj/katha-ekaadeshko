import { applyLiveDirectorPatches } from '../../../../core/realtime/liveDirectorEngine'
import type { CopilotScenePatch } from '../types/creatorStudio'
import type { StoryEpisode } from '../types/story'
/** Apply co-pilot / creator patches (caller should bump live preview). */
export function applyLiveDirectorToEpisode(
  episode: StoryEpisode,
  patches: CopilotScenePatch[]
): StoryEpisode {
  const plan = episode.cinematicDirectorPlan
  if (!plan || typeof plan !== 'object') return episode

  const nextPlan = applyLiveDirectorPatches(plan as Record<string, unknown>, patches)

  return {
    ...episode,
    cinematicDirectorPlan: nextPlan as StoryEpisode['cinematicDirectorPlan']
  }
}
