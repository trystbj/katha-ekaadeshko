/**
 * Cinematic screenplay writing locks for LLM story/script generation.
 * Shared by API blueprint and studio prompts.
 */

function genreNarrationStyle(genre, storyTone) {
  const g = String(genre || '').toLowerCase()
  const tone = String(storyTone || '').toLowerCase()
  const lines = []

  if (g.includes('romance') || tone.includes('warm') || tone.includes('tender')) {
    lines.push(
      'Romance register: softer vowels in prose, intimate proximity, emotional hesitation, meaningful pauses between confessions, warm sensory detail (touch, breath, light).'
    )
  }
  if (g.includes('horror') || g.includes('terror') || tone.includes('tense')) {
    lines.push(
      'Horror/suspense register: atmospheric dread, sensory silence, slow reveals, whispered proximity, environmental unease — never comedic deflation unless GENRE blends humor.'
    )
  }
  if (g.includes('drama') || tone.includes('dramatic')) {
    lines.push(
      'Drama register: layered subtext, realistic emotional friction, cinematic breathing room, body language and micro-reactions in narration.'
    )
  }
  if (g.includes('fantasy') || g.includes('myth') || g.includes('folk')) {
    lines.push(
      'Fantasy/folk register: immersive world texture, mythic wonder, grounded sensory magic, oral-storytelling rhythm with varied sentence length.'
    )
  }
  if (g.includes('comedy') || g.includes('humor') || tone.includes('whimsical')) {
    lines.push(
      'Comedy register: natural timing, playful rhythm, reactions and interruptions — humor from character truth, not punchline lists.'
    )
  }
  if (g.includes('mystery') || g.includes('thriller')) {
    lines.push(
      'Mystery register: patient tension, withheld information, environmental clues, emotional restraint until reveals.'
    )
  }
  if (!lines.length) {
    lines.push(
      'Cinematic register: emotionally directed prose with atmosphere, character interiority, and filmic pacing — not Wikipedia summary tone.'
    )
  }
  return lines
}

/**
 * Screenplay JSON quality rules (script prompt + blueprint).
 */
export function screenplayQualityRulesBlock(lang = 'English') {
  return [
    'SCREENPLAY QUALITY (professional — mandatory):',
    `- Visible script language: ${lang} only in narration, dialogue, and visual_description (regional culture in names/places/tone, not foreign script systems).`,
    '- Scene pacing: each scene = one clear story beat; open with image/action, not abstract summary; end on a micro-turn (reveal, choice, shock, tenderness).',
    '- Narration: cinematic audiobook voice — sensory, emotional, present-tense friendly; vary sentence length; never repeat the same opener across scenes.',
    '- Dialogue: subtext and conflict; characters respond to what was JUST said; no exposition dumps ("As you know…"); include beats, hesitation, and silence when appropriate.',
    '- Continuity: props, weather, time-of-day, injuries, and relationships carry forward unless the story changes them on-screen.',
    '- visual_description: filmable staging only — who is visible, what they do, environment, light, emotion on faces; NEVER subtitles, captions, or readable text in frame.',
    '- Forbidden filler: "Meanwhile," "Suddenly," "In a surprising turn," "The air was thick with tension" in every scene; "He/She felt sad" without showing why.',
    '- No disconnected vignettes: every scene advances plot or deepens character; no random emotional jumps.'
  ].join('\n')
}

/**
 * Blueprint block injected into generation blueprint.
 */
export function cinematicWritingBlueprintSection(input = {}) {
  const genre = String(input.genre || '').trim()
  const storyTone = String(input.storyTone || '').trim()
  const lang = String(input.__storyLanguageDisplay || 'English').trim() || 'English'

  return [
    'CINEMATIC STORYTELLING INTELLIGENCE (screenplay-grade — mandatory):',
    '- Write like a professional film narrator + screenplay writer, NOT like generic AI exposition.',
    '- Emotional progression: each scene must know what the audience should FEEL next; build tension, release, contrast, and cooldown intentionally.',
    '- Vary rhythm: mix short punchy lines with longer atmospheric passages; use silence, weather, sound, and body language.',
    '- Anti-robot rules: NEVER open multiple scenes with "Meanwhile," "Suddenly," "In that moment," "Little did they know," or identical transition templates.',
    '- Avoid list-like summary ("He did X. Then Y. Then Z."); show lived moments with sensory and emotional detail.',
    '- Scenes must feel alive: environment, faces, gestures, ambient sound, emotional tension, subtle thoughts when appropriate.',
    '- Relationship-aware: dialogue and reactions must reflect who these people are to each other RIGHT NOW.',
    ...genreNarrationStyle(genre, storyTone),
    `Language soul (${lang}): idiomatic, emotionally natural ${lang} wording — regional culture informs names, customs, and setting only; dialogue must sound spoken aloud by real people in that cultural context while staying in ${lang}.`,
    'Character conversations: include natural spoken lines in dialogue[] — interruptions, questions, emotional responses, pauses — not narration-only puppet shows.',
    'Narration may be longer when the emotional beat needs room; never pad with empty adjectives — every sentence must earn its place.',
    'Smart expansion: linger on turning points, climax, goodbye, betrayal, reunion; move faster through connective travel only when needed.',
    'Continuity: emotional tone must flow from previous scene — no random resets to neutral exposition.',
    screenplayQualityRulesBlock(lang)
  ].join('\n')
}

/**
 * @param {Array<{ name?: string; role?: string; traits?: string }>} characters
 */
export function characterPersonalityWritingBlock(characters = []) {
  if (!Array.isArray(characters) || !characters.length) return ''
  const lines = characters.map((c, i) => {
    const label = String(c.name || `Character ${i + 1}`).trim()
    const traits = String(c.traits || c.role || '').trim()
    return `- ${label}: ${traits} — LOCK speaking style (vocabulary, hesitation, directness, warmth) across ALL scenes; personality only shifts when story events justify it.`
  })
  return [
    'CHARACTER PERSONALITY MEMORY (dialogue + reactions):',
    ...lines,
    '- Shy/calm characters do not become aggressive without a motivated story beat; loud characters can soften only with cause.',
    '- Each dialogue line must sound like THAT person, not generic AI voice.'
  ].join('\n')
}

/**
 * Compose TTS + display text from script row.
 * @param {{ narration?: string, dialogue?: Array<{ character?: string, line?: string }> }} row
 */
export function composeScenePlaybackText(row) {
  const narration = String(row?.narration || '').trim()
  const dialogue = Array.isArray(row?.dialogue) ? row.dialogue : []
  const parts = []
  if (narration) parts.push(narration)

  for (const d of dialogue) {
    const who = String(d?.character || '').trim()
    const line = String(d?.line || '').trim()
    if (!line) continue
    if (who && who.toLowerCase() !== 'narration') {
      parts.push(`${who} said, "${line}"`)
    } else {
      parts.push(`"${line}"`)
    }
  }

  return parts.join('\n\n').trim()
}

/**
 * @param {Array<Record<string, unknown>>} script
 * @param {{ characters?: Array<{ name?: string; role?: string; traits?: string }> }} [story]
 */
export function attachComposedNarrationToScript(script, story) {
  const castBlock = characterPersonalityWritingBlock(story?.characters || [])
  void castBlock
  return script.map((row, i) => {
    const composed = composeScenePlaybackText(row)
    return {
      ...row,
      composed_narration: composed,
      scene: Number(row.scene) > 0 ? row.scene : i + 1
    }
  })
}
