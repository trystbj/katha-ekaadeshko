/**
 * Scene-aware narration hints appended to base narrator instructions (OpenAI TTS).
 * Adaptive engine: language → accent lock; genre → stylistic baseline; scene/storyTone → coloring;
 * character keywords → delivery tint (no UI sliders).
 */

function compactJoin(parts, maxLen = 420) {
  const s = parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
  return s.length <= maxLen ? s : `${s.slice(0, maxLen - 1)}…`
}

/** Language accent is owned by `languageDeliveryProfiles` via cinematic director — scene layer adds genre/emotion only. */
function languageAccentInstructions() {
  return ''
}

function genreStyleBaseline(genre) {
  const g = String(genre || '').toLowerCase()
  const lines = []
  if (/mystery|detective|noir/.test(g)) {
    lines.push('Genre baseline: suspenseful narration — controlled pacing, meaningful pauses before reveals.')
  }
  if (/horror|terror|ghost/.test(g)) {
    lines.push('Genre baseline: dark hushed intimacy — breath-aware dread without mumbling.')
  }
  if (/comedy|humou?r|funny/.test(g)) {
    lines.push('Genre baseline: lively timing — brighter clauses while staying intelligible.')
  }
  if (/romance|love\s+stor/.test(g)) {
    lines.push('Genre baseline: warm soft intimacy — velvet phrasing, no melodrama.')
  }
  if (/\baction\b|adventure|martial/.test(g)) {
    lines.push('Genre baseline: energetic forward momentum — crisp stressed syllables.')
  }
  if (/fantasy|magical/.test(g)) {
    lines.push('Genre baseline: airy epic lift — spacious vowels, restrained spectacle peaks.')
  }
  if (/myth|folklore|legend|epic\s+tale/.test(g)) {
    lines.push(
      'Genre baseline: folklore warmth — lyrical reverence with natural pacing; avoid slow trailer gravitas or dragging clauses.'
    )
  }
  if (/children|kids|family/.test(g)) {
    lines.push('Genre baseline: bright gentle storytelling — welcoming warmth without shouting.')
  }
  if (/\bdrama\b/.test(g)) {
    lines.push('Genre baseline: grounded emotional truth — restrained dynamics.')
  }
  return lines.join(' ')
}

function characterDeliveryHints(blob) {
  const hints = []
  if (/\b(elder|grandmother|grandfather|grandma|grandpa|old\s+sage|ancient\s+wise)\b/i.test(blob)) {
    hints.push(
      'Character-read cue (when narrator embodies elder figures): slightly slower wise pacing, soft authoritative landing.'
    )
  }
  if (/\b(child|kid\b|young\s+boy|young\s+girl|toddler|little\s+one)\b/i.test(blob)) {
    hints.push(
      'Character-read cue (child voices/lines nearby): lighter brighter onset — playful innocence without cartoon exaggeration.'
    )
  }
  if (/\b(hero|champion|defender|protagonist\s+rises)\b/i.test(blob)) {
    hints.push('Character-read cue (heroic beats): confident forward resonance — disciplined optimism.')
  }
  if (/\b(villain|antagonist|dark\s+lord|tyrant)\b/i.test(blob)) {
    hints.push('Character-read cue (villain-adjacent): darker controlled proximity — menace via timing, not rasp overload.')
  }
  if (/\b(comic\s+relief|jester|clown|buffoon)\b/i.test(blob)) {
    hints.push('Character-read cue (comic relief): playful micro-variations — nimble consonants.')
  }
  return hints
}

/**
 * @param {{ narration?: string, visualDescription?: string, genre?: string, theme?: string, storyTone?: string, storyLanguage?: string }} ctx
 * @returns {string} Additional instruction suffix (may be empty).
 */
export function narrationSceneAdaptationInstructions(ctx) {
  const narration = String(ctx?.narration || '')
  const visual = String(ctx?.visualDescription || '')
  const genre = String(ctx?.genre || '').toLowerCase()
  const theme = String(ctx?.theme || '').toLowerCase()
  const storyTone = String(ctx?.storyTone || '').toLowerCase()
  const blob = `${narration}\n${visual}\n${genre}\n${theme}\n${storyTone}`.toLowerCase()

  const langLine = languageAccentInstructions()
  const genreLine = genreStyleBaseline(ctx?.genre)

  const toneHints = []
  if (storyTone === 'tense') {
    toneHints.push(
      'Overall scene coloring from story tone: lean suspense—controlled breath, narrower vowels, patient pacing.'
    )
  } else if (storyTone === 'epic') {
    toneHints.push(
      'Overall scene coloring from story tone: mythic lift—broader vowels, slight heroic pacing without melodrama.'
    )
  } else if (storyTone === 'warm' || storyTone === 'tender') {
    toneHints.push(
      'Overall scene coloring from story tone: gentle intimacy—softer attacks, rounded compassionate phrases.'
    )
  } else if (storyTone === 'whimsical') {
    toneHints.push(
      'Overall scene coloring from story tone: playful lightness—tiny rhythmic skips allowed, still clear.'
    )
  } else if (storyTone === 'noir') {
    toneHints.push(
      'Overall scene coloring from story tone: smoky restraint—late-night intimacy, smoky consonants, cynical softness.'
    )
  }

  const hints = []

  if (
    /\b(ghost|terror|blood|scream|corpse|murder|nightmare|demon|haunted|grave)\b/i.test(blob) ||
    genre.includes('horror')
  ) {
    hints.push(
      'Scene cue: lower volume tendency, slower consonants, subtle gravel—near-whisper dread without losing clarity.'
    )
  } else if (
    /\b(laugh|joke|funny|grin|chuckle|comedy|silly|ridiculous)\b/i.test(blob) ||
    genre.includes('comedy')
  ) {
    hints.push(
      'Scene cue: slightly brighter tempo, playful rhythmic bounce, light smile in the tone—still natural speech.'
    )
  } else if (
    /\b(tear|cry|sob|grief|goodbye|death|alone|heartbreak|mourning)\b/i.test(blob) ||
    genre.includes('drama')
  ) {
    hints.push(
      'Scene cue: softer volume, stretch tender vowels, gentle fragility—protect breath noise as human emotion.'
    )
  } else if (
    /\b(run|chase|fight|explosion|battle|attack|gun|sword|crash)\b/i.test(blob) ||
    genre.includes('action')
  ) {
    hints.push(
      'Scene cue: sharper attacks on stressed syllables, slightly quicker clause pacing, urgent forward momentum.'
    )
  } else if (
    /\b(love|kiss|embrace|romance|moonlight|heart flutter)\b/i.test(blob) ||
    genre.includes('love')
  ) {
    hints.push(
      'Scene cue: warm intimate proximity, velvet pacing, gentle melodic contour—never theatrical soap opera.'
    )
  } else if (
    /\b(secret|hidden|clue|shadow|footsteps|mystery|detective)\b/i.test(blob) ||
    genre.includes('mystery') ||
    genre.includes('noir')
  ) {
    hints.push(
      'Scene cue: cinematic suspense spacing—meaningful pauses before reveals, controlled low resonance.'
    )
  } else if (
    /\b(wait|silence|tense|dread|lurking|narrow)\b/i.test(blob) ||
    genre.includes('thriller')
  ) {
    hints.push('Scene cue: restrained intensity—micro-pauses before key words.')
  } else if (
    /\b(myth|legend|ancestor|village|folk|ritual|fireside)\b/i.test(blob) ||
    theme.includes('folklore') ||
    theme.includes('myth') ||
    genre.includes('folklore')
  ) {
    hints.push(
      'Scene cue: oral-tradition cadence—long rolling phrases, reverent pacing, soulful vowel length.'
    )
  } else if (/\b(spirit|oracle|mist|cosmic|prophecy)\b/i.test(blob) || genre.includes('supernatural')) {
    hints.push(
      'Scene cue: airy mystic placement—soft onset, floating highs, spacious decay between phrases.'
    )
  }

  /** Scene-adjacent emotion keywords */
  if (/\b(sad|sorrow|melanchol)\b/i.test(blob)) {
    hints.push('Emotion cue: softer airflow, gentler phrase endings.')
  } else if (/\b(angry|rage|furious)\b/i.test(blob)) {
    hints.push('Emotion cue: sharper consonants, lean forward intensity—never shouting.')
  } else if (/\b(happy|joy|celebrate)\b/i.test(blob)) {
    hints.push('Emotion cue: brighter vowels, light uplift.')
  } else if (/\b(fear|afraid|terror)\b/i.test(blob)) {
    hints.push('Emotion cue: tense suspension—narrower vowels, patient pacing.')
  } else if (/\b(epic|legendary|cosmic\s+battle)\b/i.test(blob)) {
    hints.push('Emotion cue: fuller resonance on stakes—disciplined peaks.')
  } else if (/\b(quiet|hush|whisper|silence)\b/i.test(blob)) {
    hints.push('Emotion cue: intimate proximity—near-whisper clarity.')
  }

  const charHints = characterDeliveryHints(blob)

  const combined = [langLine, genreLine, ...toneHints, ...charHints, ...hints]
  return compactJoin(combined, 720)
}
