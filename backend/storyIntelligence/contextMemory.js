/**
 * Persistent internal memory object for long-story generation passes.
 */

/**
 * @param {object} analysis
 * @param {object} structure
 * @param {Array<object>} sceneOutline
 * @param {object} input
 */
export function buildContextMemory(analysis, structure, sceneOutline, input = {}) {
  const characters = (analysis.characters || []).map((name) => ({
    name,
    personality: 'consistent with seed',
    emotionalState: analysis.dominantEmotion || 'neutral',
    relationships: analysis.relationships || []
  }))

  const sceneSummaries = (sceneOutline || []).map((s) => ({
    sceneNumber: s.sceneNumber,
    summary: s.excerpt.slice(0, 220),
    beatType: s.beatType,
    emotionalTone: s.emotionalTone,
    continuityNote: s.continuityNote
  }))

  return {
    version: 1,
    narratorTone: input.storyTone || analysis.dominantEmotion || 'cinematic_neutral',
    visualAtmosphere: (analysis.locations || []).slice(0, 5).join(', ') || input.theme || '',
    characters,
    relationshipStates: analysis.relationships || [],
    emotionalHistory: [analysis.dominantEmotion].filter(Boolean),
    sceneSummaries,
    previousSceneRolling: [],
    pacingContinuity: structure.pacingProfile,
    dramaticBeats: structure.dramaticBeats || [],
    antiRepeatRules: [
      'Do not repeat the same narration hook twice',
      'Do not reset character knowledge between scenes',
      'Preserve relationship tension unless seed resolves it'
    ]
  }
}

/**
 * Merge generated story into context memory for downstream cinematic director.
 * @param {object} memory
 * @param {object} story
 * @param {Array<object>} script
 */
export function enrichContextMemoryFromOutputs(memory, story, script) {
  if (!memory) return memory
  const title = String(story?.title || '').trim()
  const setting = String(story?.setting || '').trim()
  const chars = Array.isArray(story?.characters) ? story.characters : []
  const rolling = (Array.isArray(script) ? script : []).slice(0, 14).map((row, i) => ({
    sceneNumber: i + 1,
    summary: String(row.narration || '').slice(0, 180),
    beatType: 'generated'
  }))

  return {
    ...memory,
    storyTitle: title,
    storySetting: setting,
    characters: chars.length
      ? chars.map((c) => ({
          name: String(c.name || ''),
          role: String(c.role || ''),
          traits: String(c.traits || ''),
          emotionalState: memory.narratorTone
        }))
      : memory.characters,
    previousSceneRolling: rolling,
    emotionalHistory: [
      ...new Set([...(memory.emotionalHistory || []), memory.narratorTone].filter(Boolean))
    ]
  }
}
