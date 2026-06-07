/**
 * Core narrative beat structure — every story must cover these beats across scenes.
 */

export const CORE_NARRATIVE_BEATS = [
  { index: 1, id: 'hook', label: 'Hook', hint: 'Open with tension, mystery, or emotional grab.' },
  { index: 2, id: 'setup', label: 'Setup', hint: 'Establish world, stakes, and character desire.' },
  { index: 3, id: 'discovery', label: 'Discovery', hint: 'Reveal new information or relationship shift.' },
  { index: 4, id: 'conflict', label: 'Conflict', hint: 'Opposition surfaces — internal or external.' },
  { index: 5, id: 'escalation', label: 'Escalation', hint: 'Raise stakes; consequences become visible.' },
  { index: 6, id: 'twist', label: 'Twist', hint: 'Subvert expectation or reveal hidden truth.' },
  { index: 7, id: 'revelation', label: 'Revelation', hint: 'Character or audience learns what matters most.' },
  { index: 8, id: 'climax', label: 'Climax', hint: 'Peak confrontation or emotional peak.' },
  { index: 9, id: 'resolution', label: 'Resolution', hint: 'Aftermath — cost, change, or healing.' },
  { index: 10, id: 'ending', label: 'Ending', hint: 'Closing image or line that lands the theme.' }
]

/**
 * @param {number} [minScenes=10]
 */
export function storyBeatStructurePromptBlock(minScenes = 10) {
  const core = CORE_NARRATIVE_BEATS.map(
    (b) => `Scene ${b.index} → ${b.label}: ${b.hint}`
  ).join('\n')
  return `MANDATORY STORY BEAT STRUCTURE (minimum ${minScenes} scenes):
${core}
Additional scenes beyond 10 must expand these beats (deeper setup, B-story, montage) — NEVER skip Hook, Setup, Discovery, Conflict, Escalation, Twist, Revelation, Climax, Resolution, or Ending.
Each scene must advance the prior scene's consequences — no emotional resets.`
}

/**
 * @param {number} sceneIndex 1-based
 */
export function beatLabelForSceneIndex(sceneIndex) {
  const n = Math.max(1, Math.floor(Number(sceneIndex) || 1))
  if (n <= CORE_NARRATIVE_BEATS.length) return CORE_NARRATIVE_BEATS[n - 1].label
  const extra = n - CORE_NARRATIVE_BEATS.length
  if (extra <= 3) return `Expansion (${extra})`
  if (extra <= 8) return 'B-story / montage'
  return 'Series continuation'
}
