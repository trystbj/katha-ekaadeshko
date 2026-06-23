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
 * Map story length → dialogue/narration entries-per-scene guidance (no backend import).
 * @param {object} input
 * @returns {{ min: number, preferred: number, max: number, label: string }}
 */
export function dialogueDensityHint(input = {}) {
  // Explicit override (e.g. runtime-bounded density resolved by the backend) wins.
  const override = input.__dialogueDensity
  if (override && typeof override === 'object') {
    return {
      min: Number(override.min) || 5,
      preferred: Number(override.preferred) || 8,
      max: Number(override.max) || 10,
      label: String(override.label || input.length || 'short')
    }
  }
  const length = String(input.length || input.storyLength || '').toLowerCase()
  const series = Boolean(
    input.seriesMode || input.isSeries || input.episodeSeries || input.__seriesMode
  )
  const epic = Boolean(input.epicMode || input.__epicMode) || length.includes('epic')
  if (epic) return { min: 10, preferred: 18, max: 25, label: 'epic' }
  if (series || length.includes('long')) return { min: 10, preferred: 15, max: 20, label: 'long' }
  if (length.includes('medium')) return { min: 8, preferred: 12, max: 15, label: 'medium' }
  return { min: 5, preferred: 8, max: 10, label: 'short' }
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
    '- Characters ASK questions, CHALLENGE ideas, express fear, express curiosity, reveal thoughts, and REACT to discoveries — never robotic AI conversation.',
    '- Characters do NOT explain obvious facts to each other; they speak from motivation, fear, hope, pride, shame, affection.',
    '- Avoid: robotic politeness, repetitive phrasing, overly formal lecture tone, one-line exchanges that end the moment instantly.',
    '- Match quality bar: professional animated films, novels, visual novels, television dramas, story-driven games.'
  ].join('\n')
}

/**
 * DIALOGUE-DRIVEN STORYTELLING — the story must be carried by conversation, not narration.
 * @param {{ min: number, preferred: number, max: number }} [density]
 */
export function dialogueDrivenStorytellingBlock(density = { min: 8, preferred: 12, max: 20 }) {
  return [
    'DIALOGUE-DRIVEN STORYTELLING (mandatory — this is the #1 rule):',
    '- Tell the story THROUGH dialogue. Target ratio per scene: 70–85% dialogue, 15–30% narration.',
    '- Do NOT summarize important events in narration. Let characters explain, discover, react, argue, question, and reveal information naturally in their own words.',
    `- Every scene must contain a MINIMUM of ${Math.max(8, density.min)} dialogue/narration entries; aim for ${density.preferred}, up to ${density.max} on key beats.`,
    '- FORBIDDEN: scenes with only 1–3 dialogue lines. Forbidden: a single narration paragraph standing in for a whole scene.',
    '- Narration is connective tissue ONLY — atmosphere, transitions, and the occasional inner thought — never the main delivery of plot.',
    '- Build emotional progression inside each scene: the conversation should change someone (a decision, a confession, a fear, a discovery) by the end.',
    '- Each scene must advance the story AND deepen at least one relationship or character.'
  ].join('\n')
}

/**
 * Travel / transition scenes — never teleport characters between locations.
 */
export function transitionScenesBlock() {
  return [
    'TRAVEL & TRANSITION SCENES (mandatory — improves pacing and animation):',
    '- Do NOT instantly move characters between distant locations. Generate intermediate scenes.',
    '- Example — instead of: Village → Castle, generate: Village → Forest Path → River Crossing → Castle Entrance.',
    '- Use transition scenes for character conversation, foreshadowing, rising tension, small discoveries, and world texture.',
    '- Each transition still obeys the dialogue-driven and minimum-entry rules — it is a real scene, not a caption.'
  ].join('\n')
}

/**
 * Mystery / suspense expansion — genre-aware.
 * @param {string} [genre]
 */
export function mysterySuspenseBlock(genre = '') {
  const g = String(genre || '').toLowerCase()
  const relevant =
    g.includes('mystery') ||
    g.includes('thriller') ||
    g.includes('horror') ||
    g.includes('fantasy') ||
    g.includes('adventure') ||
    g.includes('crime') ||
    g.includes('detective')
  if (!relevant) {
    return [
      'SUSPENSE & CURIOSITY (mandatory):',
      '- Plant small questions early and answer them later; keep the audience leaning forward.',
      '- Reveal information gradually through dialogue and discovery — never dump it all at once.'
    ].join('\n')
  }
  return [
    'MYSTERY & SUSPENSE EXPANSION (mandatory for this genre):',
    '- Spread clues across MULTIPLE scenes — never reveal everything in one place.',
    '- Introduce red herrings and misleading interpretations that characters debate.',
    '- Build tension gradually; delay major reveals; let dread/curiosity accumulate.',
    '- Create multiple twists, and do NOT solve the central mystery immediately.',
    '- Characters theorize, doubt each other, and uncover pieces through conversation and investigation.'
  ].join('\n')
}

/**
 * Cinematic direction material — every scene must feed the AI Cinematic Director.
 */
export function cinematicDirectionBlock() {
  return [
    'CINEMATIC DIRECTION MATERIAL (mandatory — feeds camera, animation, subtitle timing):',
    '- Each scene description must clearly establish: location, time of day, weather, lighting, mood, character positions, and important objects.',
    '- Provide material for: camera movement, character expressions, environmental animation, emotional pauses, and motion effects.',
    '- Stage WHERE each character stands/sits and HOW they move, so the scene can be blocked and animated.',
    '- Mark emotional shifts and dramatic pauses so the director can time reveals and reactions.'
  ].join('\n')
}

/**
 * Per-line dialogue + narration duration generation (drives narration/subtitle/animation timing).
 */
export function dialogueDurationBlock() {
  return [
    'DIALOGUE DURATION (mandatory — script JSON only):',
    '- Every dialogue line and the scene narration must include an estimated spoken duration in seconds.',
    '- Estimate naturally from spoken length (roughly 2.5–3 words per second), including breaths and dramatic pauses.',
    '- Example: Arjun: "What was that sound?" (2.4s) · Maya: "It came from the forest." (2.7s) · Narration: "The fog drifted slowly between the trees." (4.8s)',
    '- In JSON, put the number in the "duration" field on each dialogue entry, and "narration_duration" for the scene narration.',
    '- These durations drive narration timing, subtitle timing, and animation timing downstream — make them realistic.'
  ].join('\n')
}

/**
 * Cliffhanger system — every non-final chapter/episode must hook the next.
 */
export function cliffhangerBlock() {
  return [
    'CLIFFHANGER SYSTEM (mandatory):',
    '- Every non-final chapter/episode must END on: a discovery, a threat, a new clue, a suspense moment, a plot twist, or an unanswered question.',
    '- The final scene of each non-final segment should make the audience want to continue immediately.',
    '- The true ending resolves the arc; intermediate segments do not.'
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
 * Three-act plot structure for story + script generation.
 */
export function plotStructureBlock() {
  return [
    'PLOT STRUCTURE (mandatory — professional quality):',
    '- OPENING: hook curiosity, establish stakes, introduce world and want within first beats.',
    '- RISING ACTION: escalating conflict, consequences, suspense — each scene raises cost or reveals truth.',
    '- CLIMAX: peak emotional and plot intensity — decisive confrontation or revelation.',
    '- RESOLUTION: emotional payoff, consequence landing, closure that feels earned (not rushed summary).',
    '- Every scene must connect causally to the next; no random detours without story purpose.'
  ].join('\n')
}

/**
 * Enforced emotional arc across the episode.
 */
export function emotionArcBlock() {
  return [
    'EMOTION ARC (mandatory — target strong progression):',
    '- BEGINNING: curiosity, setup, gentle tension or wonder.',
    '- MIDDLE: escalation, doubt, interpersonal friction, rising stakes.',
    '- LATE MIDDLE: emotional conflict, consequences visible, audience investment peaks.',
    '- CLIMAX: peak emotional intensity — fear, love, grief, triumph, or shock as story demands.',
    '- ENDING: resolution and emotional payoff — relief, hope, grief, or bittersweet closure.',
    '- Tag each scene emotionally: no flat same-tone streak across 3+ scenes; connect feeling to prior scene.',
    '- Narration and dialogue must carry the arc — not labels alone; show through behavior and subtext.'
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
    '- Output must read like an animated film / mystery drama / visual novel screenplay — NOT an AI summary.',
    '- Dialogue-first: most of each scene is spoken dialogue; narration stays minimal and connective.',
    '- Scene length upgrade: target 2–3× the detail of thin AI summaries — richer setting, action, and emotion per scene.',
    '- Scene pacing: one clear story beat per scene; open with image/action; end on emotional or plot micro-turn.',
    '- Target scene duration 30–90 seconds of screen time; never a 1–3 line micro-scene.',
    '- Narration: keep short (1–3 sentences typical) — atmosphere/transition only; let dialogue carry the plot.',
    '- Dialogue: naturalHumanDialogue rules apply; empty dialogue[] ONLY for a deliberate pure-voiceover montage scene.',
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
  const density = dialogueDensityHint(input)

  return [
    'CINEMATIC STORYTELLING INTELLIGENCE (screenplay-grade — mandatory):',
    '- Write like a professional storyteller for animated features, mystery dramas, fantasy animation, motion comics, visual novels, and serialized storytelling — NOT generic AI exposition or summaries.',
    '- Quality bar: authored, emotionally engaging, culturally grounded — stories should feel human-written.',
    '- Emotional progression: each scene must know what the audience should FEEL next; build tension, release, contrast, cooldown.',
    '- Vary rhythm: short punchy lines + longer atmospheric passages; silence, weather, sound, body language.',
    '- Anti-robot rules: NEVER open multiple scenes with "Meanwhile," "Suddenly," "In that moment," "Little did they know," or identical templates.',
    '- Relationship-aware: dialogue and reactions reflect who these people are to each other RIGHT NOW.',
    ...genreNarrationStyle(genre, storyTone),
    `Language soul (${lang}): idiomatic, emotionally natural ${lang}; dialogue must sound spoken aloud by distinct real people.`,
    dialogueDrivenStorytellingBlock(density),
    showDontTellBlock(),
    plotStructureBlock(),
    emotionArcBlock(),
    sceneDepthBlock(),
    intelligentPacingBlock(),
    transitionScenesBlock(),
    mysterySuspenseBlock(genre),
    cliffhangerBlock(),
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
