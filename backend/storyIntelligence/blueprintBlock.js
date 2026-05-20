/**
 * Blueprint injection block for long-story intelligence.
 */

/**
 * @param {object} plan from runLongStoryIntelligence
 */
export function formatLongStoryBlueprintBlock(plan) {
  if (!plan?.active) return ''
  return `LONG-STORY INTELLIGENCE (pre-analysis — honor across story, script, and cinematic direction):
${plan.tokenBudget?.blueprintExcerpt || ''}

Scene-by-scene obligations:
- Generate between 6 and ${Math.min(10, plan.structure?.targetSceneCount || plan.targetSceneCount || 8)} script scenes (fit one valid JSON array).
- Preserve emotional continuity: ${plan.contextMemory?.narratorTone || 'cinematic'}.
- Do not contradict character memory or relationship states established in the seed.
- Match dramatic beats: ${(plan.structure?.dramaticBeats || []).join(', ') || 'standard arc'}.
- Each scene must advance the prior scene's consequences (no emotional resets).`
}
