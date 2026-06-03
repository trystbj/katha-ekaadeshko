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
      'Fantasy/folk register: immersive world texture, mythic wonder, grounded sensory magic, oral-storytelling rhythm with varied sentence length — storybook / feature-film warmth when tone fits.'
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
      'Cinematic register: emotionally directed prose with atmosphere, character interiority, and filmic pacing — authored like animated features, visual novels, or story-driven games — not Wikipedia summary tone.'
    )
  }
  return lines
}

/**
 * Natural human dialogue — anti-robot rules for dialogue[].
 */
export function naturalDialogueRulesBlock(lang = 'English') {
  return [
    'NATURAL HUMAN DIALOGUE (mandatory — dialogue[] only):',
    `- Every spoken line in ${lang} must sound like a real person talking — animated film, TV drama, visual novel, or story-game quality.`,
    '- Characters react emotionally to what was JUST said; use subtext, not exposition ("As you know…" is forbidden).',
    '- Give each character a DISTINCT voice: vocabulary, rhythm, hesitation, humor, bluntness, warmth — never interchangeable generic AI tone.',
    '- Allow natural speech: interruptions, trailing off ("I just…"), questions, pushback, awkward pauses, laughter, sighs, quiet denials.',
    '- Characters do NOT explain obvious facts to each other; they speak from motivation, fear, hope, pride, shame, affection.',
    '- Avoid: robotic politeness, repetitive phrasing, overly formal lecture tone, one-line exchanges that end the moment instantly.',
    '- When two or more characters share a scene, write MEANINGFUL back-and-forth (typically 3–8 lines total unless pure voiceover) — reactions, counter-questions, emotional beats.',
    '- Match quality bar: professional animated films, novels, visual novels, television dramas, story-driven games.'
  ].join('\n')
}

/**
 * Show don't tell — narration + visual_description.
 */
export function showDontTellBlock() {
  return [
    'SHOW INSTEAD OF TELL (mandatory):',
    '- NEVER state emotions as labels alone ("He was sad," "She was angry") without visible behavior.',
    '- SHOW through body language, pause, gaze, breath, hands, posture, environment reaction.',
    '- BAD narration: "The village was beautiful."',
    '- GOOD narration: "Warm lanterns glowed between wooden cottages while distant laughter drifted through the evening air."',
    '- BAD: "He was nervous."',
    '- GOOD: "He turned the cup in his hands twice before answering, eyes on the floor."',
    '- Let the audience infer feeling from action, sound, light, and silence — filmable moments.'
  ].join('\n')
}

/**
 * Scene depth — environment, activity, emotion (2–3× richer beats).
 */
export function sceneDepthBlock() {
  return [
    'SCENE DEPTH (2–3× richer than minimal summaries — mandatory):',
    'Each scene must feel ALIVE. Pack detail into narration + visual_description (no new JSON keys required).',
    'ENVIRONMENT — include when relevant: specific location, atmosphere, weather, ambient sound, lighting quality, surrounding textures.',
    'CHARACTER ACTIVITY — visible body language, movement, facial expression, gestures, who interacts with whom.',
    'EMOTIONAL CONTEXT — mood, tension, curiosity, fear, joy, grief; what changed since the last scene.',
    'STORY PURPOSE — every scene advances plot OR deepens character; include purpose, progression, emotional movement.',
    'Avoid repeating the same information in narration and dialogue; avoid vignettes that do not move the story forward.',
    'End each scene on a micro-turn (choice, reveal, silence, touch, departure) that pulls into the next beat.'
  ].join('\n')
}

/**
 * Intelligent pacing — dialogue vs narration vs action.
 */
export function intelligentPacingBlock() {
  return [
    'INTELLIGENT PACING (mandatory):',
    '- Balance dialogue, narration, action, and emotional stillness — do not rush turning points.',
    '- Let important moments breathe: reunions, betrayals, confessions, losses, discoveries earn 3–6 narration sentences when needed.',
    '- Do not jump emotional states without on-screen cause; connective travel may be shorter, but climax and intimacy are longer.',
    '- Dialogue-heavy scenes: prioritize conversation rhythm; action-heavy scenes: kinetic visual_description + shorter lines.',
    '- Avoid machine-like beat lists ("Then X. Then Y."); weave cause and effect through sensory continuity.'
  ].join('\n')
}

/**
 * Leonardo-ready visual_description density.
 */
export function visualDescriptionForImagesBlock() {
  return [
    'VISUAL_DESCRIPTION FOR IMAGE GENERATION (mandatory — 2–3 sentences minimum when scene has characters):',
    '- Describe WHO is visible, WHERE they are, WHAT they are doing, and the EMOTIONAL atmosphere.',
    '- Include: environment storytelling, weather/light, camera-friendly composition (wide / medium / close), cinematic framing hints.',
    '- Include: body language, expressions, key props, time of day — this field directly drives illustration; be concrete and filmable.',
    '- NO readable text, subtitles, captions, logos, or UI in frame.',
    '- Do not paste narration verbatim; stage the single illustrated moment clearly.'
  ].join('\n')
}

/**
 * Screenplay JSON quality rules (script prompt + blueprint).
 */
export function screenplayQualityRulesBlock(lang = 'English') {
  return [
    'SCREENPLAY QUALITY (professional — mandatory):',
    `- Visible script language: ${lang} only in narration, dialogue, and visual_description.`,
    '- Scene length upgrade: target 2–3× the detail of thin AI summaries — richer setting, action, and emotion per scene.',
    '- Scene pacing: one clear story beat per scene; open with image/action; end on emotional or plot micro-turn.',
    '- Narration: 3–6 sentences when the beat needs depth (2–4 minimum for quiet beats); cinematic audiobook voice; vary rhythm.',
    '- Dialogue: naturalHumanDialogue rules apply; empty dialogue[] only for pure voiceover montage scenes.',
    '- Continuity: props, weather, time-of-day, injuries, relationships carry forward unless changed on-screen.',
    '- Professional structure: purpose + progression + character development + visual storytelling in every scene.',
    '- Forbidden filler: "Meanwhile," "Suddenly," "In a surprising turn," generic tension clichés every scene.',
    '- No disconnected vignettes or random emotional resets.',
    visualDescriptionForImagesBlock()
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
    '- Write like a professional storyteller for animated features, visual novels, story-driven games, and cinematic short films — NOT generic AI exposition.',
    '- Quality bar: authored, emotionally engaging, culturally grounded — stories should feel human-written.',
    '- Emotional progression: each scene must know what the audience should FEEL next; build tension, release, contrast, cooldown.',
    '- Vary rhythm: short punchy lines + longer atmospheric passages; silence, weather, sound, body language.',
    '- Anti-robot rules: NEVER open multiple scenes with "Meanwhile," "Suddenly," "In that moment," "Little did they know," or identical templates.',
    '- Relationship-aware: dialogue and reactions reflect who these people are to each other RIGHT NOW.',
    ...genreNarrationStyle(genre, storyTone),
    `Language soul (${lang}): idiomatic, emotionally natural ${lang}; dialogue must sound spoken aloud by distinct real people.`,
    showDontTellBlock(),
    sceneDepthBlock(),
    intelligentPacingBlock(),
    naturalDialogueRulesBlock(lang),
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
    const role = String(c.role || '').trim()
    return [
      `- ${label}:`,
      `  traits: ${traits || 'define clearly'}`,
      role ? `  role: ${role}` : '',
      '  LOCK: unique speech pattern (word choice, sentence length, humor, formality), motivations, strengths, weaknesses, emotional triggers',
      '  Dialogue must be recognizable as THIS character without name tags in tone alone'
    ]
      .filter(Boolean)
      .join('\n')
  })
  return [
    'CHARACTER PERSONALITY MEMORY (dialogue + reactions — mandatory):',
    ...lines,
    '- No two characters share the same voice; shy stays shy unless story motivates change; bold can soften with cause.',
    '- Responses must reflect personality: impatient characters interrupt; thoughtful characters pause; proud characters deflect.',
    '- Each line: context-realistic reaction, not generic assistant politeness.'
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
  void characterPersonalityWritingBlock(story?.characters || [])
  return script.map((row, i) => {
    const composed = composeScenePlaybackText(row)
    return {
      ...row,
      composed_narration: composed,
      scene: Number(row.scene) > 0 ? row.scene : i + 1
    }
  })
}
