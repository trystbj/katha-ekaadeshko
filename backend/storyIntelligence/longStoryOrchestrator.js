/**
 * Long-story intelligence orchestrator — sync preprocessing before LLM stages.
 *
 * User Story Seed → Story Analyzer → Narrative Structure → Scene Splitter
 * → Context Memory → Token budget → Blueprint + script hints
 */

import { LONG_STORY_ACTIVATION_CHARS } from './constants.js'
import { analyzeStorySeed } from './storyAnalyzer.js'
import { analyzeNarrativeStructure } from './narrativeStructureAnalyzer.js'
import { splitSeedIntoScenes } from './sceneSplitter.js'
import { buildContextMemory } from './contextMemory.js'
import { buildTokenBudgetArtifacts } from './tokenBudget.js'
import { formatLongStoryBlueprintBlock } from './blueprintBlock.js'
import { enrichContextMemoryFromOutputs } from './contextMemory.js'

/**
 * @param {object} input normalized pipeline input (seedLineRaw preferred)
 * @param {{ onProgress?: (p: object) => void }} [opts]
 */
export function runLongStoryIntelligence(input, opts = {}) {
  const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : null
  const rawSeed = String(input.seedLineRaw || input.seedLine || '').trim()
  const fullLen = input.seedLineFullChars || rawSeed.length

  if (fullLen < LONG_STORY_ACTIVATION_CHARS) {
    return { active: false, reason: 'seed_below_threshold', seedChars: fullLen }
  }

  if (onProgress) {
    onProgress({ stage: 'long_story_analyze', progress: 2, message: 'Analyzing story seed' })
  }
  const analysis = analyzeStorySeed(rawSeed, input)

  if (onProgress) {
    onProgress({
      stage: 'narrative_structure',
      progress: 3,
      message: 'Mapping narrative structure'
    })
  }
  const structure = analyzeNarrativeStructure(rawSeed, analysis, input)

  if (onProgress) {
    onProgress({
      stage: 'scene_outline',
      progress: 4,
      message: `Planning ${structure.targetSceneCount} cinematic scenes`
    })
  }
  const sceneOutline = splitSeedIntoScenes(rawSeed, structure, analysis)

  if (onProgress) {
    onProgress({ stage: 'context_memory', progress: 5, message: 'Building story memory' })
  }
  const contextMemory = buildContextMemory(analysis, structure, sceneOutline, input)
  const tokenBudget = buildTokenBudgetArtifacts({ contextMemory, sceneOutline, analysis, structure })

  const plan = {
    active: true,
    seedChars: fullLen,
    analysis,
    structure,
    sceneOutline,
    contextMemory,
    tokenBudget,
    blueprintBlock: '',
    targetSceneCount: structure.targetSceneCount
  }
  plan.blueprintBlock = formatLongStoryBlueprintBlock(plan)
  return plan
}

export { enrichContextMemoryFromOutputs, formatLongStoryBlueprintBlock }
