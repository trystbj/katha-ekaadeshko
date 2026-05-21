/**
 * Scene-to-scene continuity tracker — weather, time, wardrobe, injuries, location.
 */

const WEATHER_RE =
  /\b(rain|storm|snow|fog|mist|sunny|cloud|wind|thunder|monsoon|पानी|हिउँ|तुवाँलो)\b/i
const TIME_RE =
  /\b(dawn|sunrise|morning|noon|afternoon|dusk|sunset|night|midnight|moonlight|बिहान|बेलुका|रात)\b/i
const INJURY_RE = /\b(injured|wound|bleeding|bruise|bandage|hurt|limping)\b/i
const WARDROBE_RE = /\b(red sari|blue coat|white dress|armor|uniform|hat|scarf|same outfit)\b/i

/**
 * @param {Array<{ narration?: string; visual_description?: string }>} script
 * @param {object} [priorWorld]
 */
export function buildContinuityState(script = [], priorWorld = null) {
  const rows = Array.isArray(script) ? script : []
  const scenes = []
  let lastWeather = priorWorld?.weather || 'unknown'
  let lastTime = priorWorld?.timeOfDay || 'unknown'
  let lastLocation = priorWorld?.location || ''
  const injuries = new Set(priorWorld?.activeInjuries || [])
  const wardrobe = new Map(Object.entries(priorWorld?.wardrobeByCharacter || {}))

  for (let i = 0; i < rows.length; i++) {
    const blob = `${rows[i]?.narration || ''} ${rows[i]?.visual_description || ''}`
    const weatherM = blob.match(WEATHER_RE)
    if (weatherM) lastWeather = weatherM[0].toLowerCase()
    const timeM = blob.match(TIME_RE)
    if (timeM) lastTime = timeM[0].toLowerCase()
    const locM = blob.match(/\b(in|at|inside)\s+([A-Za-z\u0900-\u097F][\w\s]{2,48})/i)
    if (locM?.[2]) lastLocation = locM[2].trim().slice(0, 60)
    if (INJURY_RE.test(blob)) injuries.add(`scene_${i + 1}_injury`)
    const wardM = blob.match(WARDROBE_RE)
    if (wardM) wardrobe.set(`scene_${i + 1}`, wardM[0])

    scenes.push({
      sceneIndex: i + 1,
      weather: lastWeather,
      timeOfDay: lastTime,
      location: lastLocation,
      activeInjuries: [...injuries],
      wardrobeNote: wardM ? wardM[0] : wardrobe.get(`scene_${i - 1}`) || null,
      emotionalCarry: INJURY_RE.test(blob) ? 'wounded' : null
    })
  }

  return {
    version: 1,
    scenes,
    weather: lastWeather,
    timeOfDay: lastTime,
    location: lastLocation,
    activeInjuries: [...injuries],
    wardrobeByCharacter: Object.fromEntries(wardrobe),
    warnings: detectContinuityWarnings(scenes)
  }
}

function detectContinuityWarnings(scenes) {
  const warnings = []
  for (let i = 1; i < scenes.length; i++) {
    const prev = scenes[i - 1]
    const cur = scenes[i]
    if (prev.timeOfDay === 'night' && cur.timeOfDay === 'sunrise' && i < scenes.length - 2) {
      /* natural progression */
    } else if (prev.timeOfDay !== 'unknown' && cur.timeOfDay !== 'unknown' && prev.timeOfDay !== cur.timeOfDay) {
      if (
        (prev.timeOfDay.includes('night') && cur.timeOfDay.includes('morning')) === false &&
        Math.abs(i) > 0
      ) {
        warnings.push({ sceneIndex: cur.sceneIndex, type: 'time_jump', detail: `${prev.timeOfDay} → ${cur.timeOfDay}` })
      }
    }
  }
  return warnings.slice(0, 6)
}

/**
 * Merge continuity into story memory snapshot.
 */
export function mergeContinuityIntoMemory(snapshot, continuity) {
  if (!snapshot || !continuity) return snapshot
  return {
    ...snapshot,
    continuity: {
      weather: continuity.weather,
      timeOfDay: continuity.timeOfDay,
      location: continuity.location,
      activeInjuries: continuity.activeInjuries,
      sceneNotes: continuity.scenes?.slice(-4).map((s) => `Scene ${s.sceneIndex}: ${s.weather}, ${s.timeOfDay}`)
    },
    continuityLocks: [
      ...(snapshot.continuityLocks || []),
      continuity.location ? `Location thread: ${continuity.location}` : '',
      continuity.weather !== 'unknown' ? `Weather thread: ${continuity.weather}` : ''
    ].filter(Boolean)
  }
}
