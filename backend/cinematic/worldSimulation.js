/**
 * Persistent world simulation — tracks evolving world state across episodes.
 */

function pickSeason(blob, prior) {
  if (/\b(winter|snow|frost|blizzard)\b/i.test(blob)) return 'winter'
  if (/\b(spring|bloom|blossom)\b/i.test(blob)) return 'spring'
  if (/\b(summer|heat|drought)\b/i.test(blob)) return 'summer'
  if (/\b(autumn|harvest|fall leaves)\b/i.test(blob)) return 'autumn'
  return prior?.season || 'unknown'
}

/**
 * @param {object} [story]
 * @param {Array<{ narration?: string, visual_description?: string }>} [script]
 * @param {object} [priorWorldState]
 */
export function buildWorldSimulationState(story, script, priorWorldState = null) {
  const prior = priorWorldState && typeof priorWorldState === 'object' ? priorWorldState : null
  const rows = Array.isArray(script) ? script : []
  let blob = `${story?.setting || ''} `
  for (const r of rows) blob += `${r.narration || ''} ${r.visual_description || ''} `

  const damagedLocations = [...(prior?.damagedLocations || [])]
  const evolvedLocations = [...(prior?.evolvedLocations || [])]
  const worldEvents = [...(prior?.worldEvents || [])].slice(-12)
  const culturalShift = [...(prior?.culturalShift || [])].slice(-6)

  const locMatches = blob.match(/\b(village|city|temple|kingdom|forest|fort)\s+[\w\s]{2,30}/gi) || []
  if (/\b(destroyed|burned|ruins|fallen|siege|war)\b/i.test(blob)) {
    for (const m of locMatches.slice(0, 3)) {
      const loc = m.trim().slice(0, 48)
      if (loc && !damagedLocations.includes(loc)) damagedLocations.push(loc)
    }
    if (!worldEvents.some((e) => /war|conflict/i.test(e))) worldEvents.push('Conflict or destruction noted')
  }
  if (/\b(rebuilt|restored|peace|treaty)\b/i.test(blob)) {
    for (const m of locMatches.slice(0, 2)) {
      const loc = m.trim().slice(0, 48)
      if (loc && !evolvedLocations.includes(loc)) evolvedLocations.push(loc)
    }
  }
  if (/\b(corrupt|curse|dark magic|blight)\b/i.test(blob)) {
    if (!worldEvents.some((e) => /corruption/i.test(e))) worldEvents.push('Magical corruption spreading')
  }
  if (/\b(festival|coronation|revolution|migration)\b/i.test(blob)) {
    culturalShift.push('Cultural or political shift in progress')
  }

  const warActive =
    prior?.warActive === true ||
    /\b(war|battlefront|army|invasion|siege)\b/i.test(blob)
  const politicalTension = Math.min(
    1,
    (prior?.politicalTension ?? 0.3) +
      (warActive ? 0.25 : 0) +
      (/\b(rebel|uprising|betrayal|throne)\b/i.test(blob) ? 0.15 : 0)
  )
  let economyState = prior?.economyState || 'stable'
  if (/\b(famine|poverty|collapse|plunder)\b/i.test(blob)) economyState = 'collapsed'
  else if (/\b(tax|shortage|scarcity|trade block)\b/i.test(blob)) economyState = 'strained'

  const magicalCorruption = Math.min(
    1,
    (prior?.magicalCorruption ?? 0) + (/\b(corrupt|curse|dark magic)\b/i.test(blob) ? 0.2 : 0)
  )

  let weatherTrend = prior?.weatherTrend || 'stable'
  if (/\b(long rain|endless storm|drought)\b/i.test(blob)) weatherTrend = 'prolonged_extreme'
  else if (/\b(rain|storm)\b/i.test(blob)) weatherTrend = 'wet'

  return {
    version: 1,
    season: pickSeason(blob, prior),
    weatherTrend,
    politicalTension,
    warActive,
    economyState,
    damagedLocations: damagedLocations.slice(0, 12),
    evolvedLocations: evolvedLocations.slice(0, 12),
    magicalCorruption,
    culturalShift: culturalShift.slice(-6),
    worldEvents: worldEvents.slice(-12),
    updatedAt: new Date().toISOString()
  }
}

/** Prose block for generation blueprint. */
export function worldSimulationBlueprintBlock(world) {
  if (!world) return ''
  const lines = ['WORLD SIMULATION (persistent — honor across episodes):']
  if (world.season !== 'unknown') lines.push(`Season: ${world.season}`)
  if (world.weatherTrend) lines.push(`Weather trend: ${world.weatherTrend}`)
  if (world.warActive) lines.push('Active war/conflict affects environments and tone.')
  if (world.damagedLocations?.length) {
    lines.push(`Damaged locations: ${world.damagedLocations.join('; ')}`)
  }
  if (world.magicalCorruption > 0.2) {
    lines.push(`Magical corruption level: ${Math.round(world.magicalCorruption * 100)}%`)
  }
  if (world.worldEvents?.length) {
    lines.push('Recent world events:', ...world.worldEvents.slice(-4).map((e) => `- ${e}`))
  }
  return lines.join('\n').slice(0, 1600)
}

export function mergeWorldStateForProject(prior, next) {
  if (!next) return prior
  return next
}
