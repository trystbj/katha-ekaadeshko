import {
  LONG_STORY_BLUEPRINT_MAX_CHARS,
  LONG_STORY_SCRIPT_CONTEXT_MAX_CHARS
} from './constants.js'

/**
 * Compact scene outline for script prompt injection.
 * @param {Array<object>} sceneOutline
 */
export function formatSceneOutlineForScript(sceneOutline, maxChars = LONG_STORY_SCRIPT_CONTEXT_MAX_CHARS) {
  const lines = (sceneOutline || []).map(
    (s) =>
      `Scene ${s.sceneNumber} [${s.beatType}]: ${s.excerpt.slice(0, 140).replace(/\s+/g, ' ')}… (${s.continuityNote})`
  )
  let out = lines.join('\n')
  if (out.length > maxChars) out = `${out.slice(0, maxChars - 24)}…`
  return out
}

/**
 * @param {object} contextMemory
 * @param {object} analysis
 */
export function formatContextMemoryCompact(contextMemory, analysis) {
  const chars = (contextMemory?.characters || [])
    .slice(0, 6)
    .map((c) => c.name || c)
    .join(', ')
  const locs = (analysis?.locations || []).join(', ')
  return [
    `Characters: ${chars || '(infer from seed)'}`,
    `Locations: ${locs || '(from seed)'}`,
    `Emotional through-line: ${contextMemory?.narratorTone || 'cinematic'}`,
    `Pacing: ${contextMemory?.pacingContinuity || 'standard'}`,
    `Rules: ${(contextMemory?.antiRepeatRules || []).slice(0, 2).join('; ')}`
  ].join('\n')
}

/**
 * @param {object} params
 */
export function buildTokenBudgetArtifacts({ contextMemory, sceneOutline, analysis, structure }) {
  return {
    blueprintExcerpt: buildBlueprintExcerpt({ contextMemory, sceneOutline, analysis, structure }),
    scriptContext: formatSceneOutlineForScript(sceneOutline),
    contextMemoryCompact: formatContextMemoryCompact(contextMemory, analysis)
  }
}

function buildBlueprintExcerpt({ contextMemory, sceneOutline, analysis, structure }) {
  const parts = [
    `LONG-STORY MODE: ${structure?.narrativeShape || 'cinematic'} · target ${structure?.targetSceneCount || 8} scenes`,
    formatContextMemoryCompact(contextMemory, analysis),
    `Beats: ${(structure?.dramaticBeats || []).join(', ') || 'standard arc'}`,
    `Scene plan (${(sceneOutline || []).length} units):`,
    ...(sceneOutline || []).slice(0, 10).map(
      (s) => `  ${s.sceneNumber}. [${s.beatType}] ${s.excerpt.slice(0, 100).replace(/\s+/g, ' ')}`
    )
  ]
  let text = parts.join('\n')
  if (text.length > LONG_STORY_BLUEPRINT_MAX_CHARS) {
    text = `${text.slice(0, LONG_STORY_BLUEPRINT_MAX_CHARS - 20)}…`
  }
  return text
}
