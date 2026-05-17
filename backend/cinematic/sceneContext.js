/**
 * Scene context analysis from narration + visual description.
 */

function norm(s) {
  return String(s ?? '')
    .toLowerCase()
    .trim()
}

/**
 * @param {{ narration?: string, visualDescription?: string, storyTone?: string, genre?: string }} row
 */
export function analyzeSceneContext(row) {
  const narration = norm(row.narration)
  const visual = norm(row.visualDescription)
  const blob = `${narration}\n${visual}`
  const genre = norm(row.genre)
  const storyTone = norm(row.storyTone)

  let emotion = 'neutral'
  let tension = 0.35
  let actionLevel = 0.2
  let suspenseLevel = 0.25

  if (/\b(laugh|joy|happy|celebrate|smile|grin)\b/.test(blob)) emotion = 'joy'
  else if (/\b(cry|tear|grief|mourning|heartbreak|sad|alone\b|loss)\b/.test(blob)) emotion = 'sadness'
  else if (/\b(terror|scream|horror|nightmare|demon|blood|haunted)\b/.test(blob)) emotion = 'fear'
  else if (/\b(angry|rage|furious|yell)\b/.test(blob)) emotion = 'anger'
  else if (/\b(surprise|gasp|shock|suddenly|reveal)\b/.test(blob)) emotion = 'surprise'
  else if (/\b(secret|hidden|shadow|footsteps|mystery|clue)\b/.test(blob)) emotion = 'suspense'
  else if (/\b(magic|wonder|cosmic|prophecy|spirit)\b/.test(blob)) emotion = 'wonder'
  else if (/\b(peaceful|calm|gentle|quiet morning|serene)\b/.test(blob)) emotion = 'peace'

  if (storyTone === 'tense') tension = Math.max(tension, 0.65)
  if (storyTone === 'noir') suspenseLevel = Math.max(suspenseLevel, 0.7)
  if (/horror|thriller|mystery/.test(genre)) suspenseLevel = Math.max(suspenseLevel, 0.55)
  if (/\b(fight|chase|battle|explosion|sword|run\b|attack)\b/.test(blob)) actionLevel = 0.85
  if (/\b(wait|silence|lurking|dread)\b/.test(blob)) suspenseLevel = Math.max(suspenseLevel, 0.75)
  if (emotion === 'fear') {
    tension = Math.max(tension, 0.7)
    suspenseLevel = Math.max(suspenseLevel, 0.8)
  }
  if (emotion === 'sadness') tension = Math.min(tension, 0.45)

  const weather = {
    rain: /\b(rain|raining|storm|downpour)\b/.test(blob) ? 0.7 : 0,
    wind: /\b(wind|gust|howling)\b/.test(blob) ? 0.55 : 0,
    thunder: /\b(thunder|lightning)\b/.test(blob) ? 0.8 : 0,
    fog: /\b(fog|mist|haze|smoke)\b/.test(blob) ? 0.6 : 0,
    snow: /\b(snow|blizzard|frost)\b/.test(blob) ? 0.5 : 0
  }

  const location = /\b(forest|jungle|woods)\b/.test(blob)
    ? 'forest'
    : /\b(city|street|traffic|market)\b/.test(blob)
      ? 'city'
      : /\b(cave|tunnel|underground)\b/.test(blob)
        ? 'cave'
        : /\b(temple|shrine|monastery)\b/.test(blob)
          ? 'temple'
          : /\b(village|hamlet|farm)\b/.test(blob)
            ? 'village'
            : /\b(mountain|himal|peak)\b/.test(blob)
              ? 'mountain'
              : 'general'

  const timeOfDay = /\b(night|midnight|moonlight|darkness)\b/.test(blob)
    ? 'night'
    : /\b(dawn|sunrise|morning)\b/.test(blob)
      ? 'morning'
      : /\b(dusk|sunset|golden hour|evening)\b/.test(blob)
        ? 'evening'
        : 'day'

  return {
    blob,
    emotion,
    tension: Math.min(1, Math.max(0, tension)),
    actionLevel: Math.min(1, Math.max(0, actionLevel)),
    suspenseLevel: Math.min(1, Math.max(0, suspenseLevel)),
    weather,
    location,
    timeOfDay
  }
}
