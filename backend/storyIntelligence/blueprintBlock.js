/**
 * Blueprint injection block for long-story intelligence.
 */

import { ABSOLUTE_MIN_SCENES } from '../utils/sceneCountPolicy.js'
import { storyBeatStructurePromptBlock } from '../../shared/storySceneBeats.js'

/**
 * @param {object} plan from runLongStoryIntelligence
 */
export function formatLongStoryBlueprintBlock(plan) {
  if (!plan?.active) return ''
  const min = Math.max(ABSOLUTE_MIN_SCENES, plan.structure?.minSceneCount || ABSOLUTE_MIN_SCENES)
  const max = plan.structure?.maxSceneCount || plan.targetSceneCount || 14
  const target = Math.min(max, Math.max(min, plan.structure?.targetSceneCount || plan.targetSceneCount || min))
  return `LONG-STORY INTELLIGENCE (pre-analysis — honor across story, script, and cinematic direction):
${plan.tokenBudget?.blueprintExcerpt || ''}

${storyBeatStructurePromptBlock(min)}

Scene-by-scene obligations:
- Generate between ${min} and ${target} script scenes (never fewer than ${ABSOLUTE_MIN_SCENES}).
- Preserve emotional continuity: ${plan.contextMemory?.narratorTone || 'cinematic'}.
- Do not contradict character memory or relationship states established in the seed.
- Match dramatic beats: ${(plan.structure?.dramaticBeats || []).join(', ') || 'standard arc'}.
- Each scene must advance the prior scene's consequences (no emotional resets).
- visual_description: artwork only — NO speech bubbles, captions, or readable text in frame.`
}
