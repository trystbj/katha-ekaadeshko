/**
 * AI scene breakdown — classifies each script row into cinematic beat types.
 */

/**
 * @param {string} narration
 * @param {string} visual
 * @param {number} sceneIndex
 * @param {number} sceneCount
 */
export function classifySceneBeat(narration, visual, sceneIndex, sceneCount) {
  const blob = `${narration} ${visual}`.toLowerCase()
  const progress = sceneCount > 1 ? sceneIndex / (sceneCount - 1) : 0

  if (/\b(remember|years ago|flashback|once upon|used to)\b/.test(blob)) return 'flashback'
  if (/\b(reveal|truth|finally|discovered|secret exposed)\b/.test(blob)) return 'reveal'
  if (progress > 0.82 && /\b(suddenly|at last|climax|final)\b/.test(blob)) return 'climax'
  if (/\b(fight|chase|battle|attack|sword|explosion)\b/.test(blob)) return 'action'
  if (/\b(cry|tear|grief|heartbreak|goodbye|loss)\b/.test(blob)) return 'emotional'
  if (/\b(wait|footsteps|lurking|dread|silence)\b/.test(blob)) return 'suspense'
  if (/\b(landscape|village|kingdom|world|distant|horizon)\b/.test(blob) && blob.length < 120) {
    return 'world_building'
  }
  if (/\b(fog|mist|rain|wind|atmosphere|sky)\b/.test(blob) && !/\b(said|asked|replied)\b/.test(blob)) {
    return 'atmosphere'
  }
  if (/\b(said|asked|whispered|shouted|replied|dialogue)\b/.test(blob)) return 'dialogue'
  if (sceneIndex > 0 && blob.length < 40) return 'transition'
  return 'general'
}

function pacingForBeat(beat, tension, actionLevel) {
  if (beat === 'action' || beat === 'climax') return 'burst'
  if (beat === 'emotional' || beat === 'flashback') return 'slow'
  if (beat === 'suspense') return 'moderate'
  if (actionLevel > 0.65) return 'fast'
  if (tension > 0.7) return 'fast'
  return 'moderate'
}

/**
 * @param {Array<{ narration?: string, visual_description?: string }>} script
 * @param {object} [story]
 * @param {object} [input]
 */
export function buildSceneBreakdown(script, story, input) {
  const rows = Array.isArray(script) ? script : []
  const n = rows.length
  const units = []

  for (let i = 0; i < n; i++) {
    const row = rows[i] || {}
    const narration = String(row.narration || '')
    const visual = String(row.visual_description || '')
    const blob = `${narration} ${visual}`

    let tension = 0.35
    let actionLevel = 0.2
    if (/\b(fight|chase|run)\b/i.test(blob)) actionLevel = 0.85
    if (/\b(fear|terror|dread)\b/i.test(blob)) tension = 0.75
    if (input?.storyTone === 'tense') tension = Math.max(tension, 0.65)

    const beatType = classifySceneBeat(narration, visual, i, n)
    const emotionalIntensity = Math.min(1, tension * 0.5 + actionLevel * 0.35 + (beatType === 'emotional' ? 0.25 : 0))
    const cinematicImportance =
      beatType === 'climax' || beatType === 'reveal' ? 0.9 : beatType === 'action' ? 0.75 : 0.45 + tension * 0.3

    units.push({
      sceneIndex: i + 1,
      beatType,
      emotionalIntensity,
      pacingProfile: pacingForBeat(beatType, tension, actionLevel),
      cinematicImportance,
      narration: narration.slice(0, 2000),
      visualDescription: visual.slice(0, 1200)
    })
  }

  return units
}
