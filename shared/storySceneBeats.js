/**
 * Core narrative beat structure — every story must cover these beats across scenes.
 * Scaled stories (long / epic) expand each beat into multiple scenes with travel,
 * subplot, and suspense beats between the core turns.
 */

export const CORE_NARRATIVE_BEATS = [
  { index: 1, id: 'hook', label: 'Hook', hint: 'Open with tension, mystery, or emotional grab — in dialogue or action, not summary.' },
  { index: 2, id: 'setup', label: 'Setup', hint: 'Establish world, stakes, and character desire through what characters say and do.' },
  { index: 3, id: 'discovery', label: 'Discovery', hint: 'Reveal new information or relationship shift — let a character voice the realization.' },
  { index: 4, id: 'conflict', label: 'Conflict', hint: 'Opposition surfaces — internal or external; characters argue, question, resist.' },
  { index: 5, id: 'escalation', label: 'Escalation', hint: 'Raise stakes; consequences become visible; tension rises across travel/transition beats.' },
  { index: 6, id: 'twist', label: 'Twist', hint: 'Subvert expectation or reveal hidden truth — delay, do not rush the reveal.' },
  { index: 7, id: 'revelation', label: 'Revelation', hint: 'Character or audience learns what matters most.' },
  { index: 8, id: 'climax', label: 'Climax', hint: 'Peak confrontation or emotional peak — dialogue carries the decisive moment.' },
  { index: 9, id: 'resolution', label: 'Resolution', hint: 'Aftermath — cost, change, or healing.' },
  { index: 10, id: 'ending', label: 'Ending', hint: 'Closing image or line that lands the theme.' }
]

/**
 * @param {number} [minScenes=10]
 */
export function storyBeatStructurePromptBlock(minScenes = 10) {
  const core = CORE_NARRATIVE_BEATS.map(
    (b) => `Beat ${b.index} → ${b.label}: ${b.hint}`
  ).join('\n')
  const expansion =
    minScenes > 10
      ? `\nEXPANSION (story needs ${minScenes}+ scenes): expand each beat into MULTIPLE scenes. Insert intermediate scenes between core turns — travel/transition scenes (do NOT teleport characters between locations), quiet character moments, subplot beats, gradual clue placement, and rising-tension scenes. Pacing must feel like an animated film, not a compressed summary.`
      : ''
  return `MANDATORY STORY BEAT STRUCTURE (minimum ${minScenes} scenes):
${core}
Additional scenes must expand these beats (deeper setup, B-story, travel, montage, suspense) — NEVER skip Hook, Setup, Discovery, Conflict, Escalation, Twist, Revelation, Climax, Resolution, or Ending.
Each scene must advance the prior scene's consequences — no emotional resets, no rushed transitions.${expansion}
CLIFFHANGERS: every chapter/episode that is NOT the final one must end on a discovery, threat, new clue, suspense moment, plot twist, or unanswered question that makes the audience want to continue immediately.`
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
