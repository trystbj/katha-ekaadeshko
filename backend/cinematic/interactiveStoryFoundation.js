/**
 * Interactive story mode foundation (branching not enabled — architecture only).
 */

/**
 * @param {object} [story]
 * @param {Array<object>} [relationships]
 */
export function buildInteractiveStoryFoundation(story, relationships) {
  const choiceSlots = []
  const chars = Array.isArray(story?.characters) ? story.characters : []
  if (chars.length >= 2) {
    choiceSlots.push({
      id: 'trust_path',
      label: 'Trust alliance',
      consequenceHint: 'Strengthens loyalty arcs in future episodes'
    })
    choiceSlots.push({
      id: 'confront_path',
      label: 'Confront tension',
      consequenceHint: 'Raises rivalry and pacing intensity'
    })
  }

  return {
    architectureVersion: 1,
    branchingEnabled: false,
    choiceSlots: choiceSlots.slice(0, 4),
    alternateEndingSlots: ['hopeful_resolution', 'bittersweet_cost', 'open_mystery']
  }
}
