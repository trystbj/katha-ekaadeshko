/**
 * Episode cliffhanger / hook generation from final scenes.
 */

/**
 * @param {Array<{ narration?: string, visual_description?: string }>} script
 * @param {object} [story]
 * @param {string} [genre]
 */
export function inferCliffhangerPlan(script, story, genre) {
  const rows = Array.isArray(script) ? script : []
  const last = rows[rows.length - 1] || {}
  const blob = `${last.narration || ''} ${last.visual_description || ''}`.toLowerCase()
  const g = String(genre || '').toLowerCase()

  let hookType = 'suspense'
  let intensity = 0.72
  let suggestedLine = String(last.narration || '').trim().slice(0, 200)
  let teaseNextEpisode = true

  if (/\b(love|heart|goodbye|tear)\b/.test(blob)) {
    hookType = 'emotional'
    intensity = 0.68
  }
  if (/\b(secret|truth|discovered|reveal|who\b)\b/.test(blob)) {
    hookType = 'mystery'
    intensity = 0.8
  }
  if (/\b(attack|chase|explosion|battle)\b/.test(blob)) {
    hookType = 'action_tease'
    intensity = 0.85
  }
  if (/\b(suddenly|appeared|impossible)\b/.test(blob)) {
    hookType = 'revelation'
    intensity = 0.88
  }
  if (g.includes('horror')) {
    hookType = 'suspense'
    intensity = 0.9
  }

  if (!suggestedLine && typeof story?.title === 'string') {
    suggestedLine = `The story of ${story.title} is only beginning…`
  }

  return {
    hookType,
    intensity: Math.min(1, intensity),
    suggestedLine: suggestedLine || 'To be continued…',
    teaseNextEpisode
  }
}
