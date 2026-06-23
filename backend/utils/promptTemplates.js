import { summarizeMemory } from './memoryStore.js'
import { buildStoryStyleHintLine, buildScriptVisualStyleSection } from './visualStyleLock.js'
import {
  OUTPUT_LANGUAGE,
  englishOutputEnforcementBlock,
  regionalCultureContextLine
} from '../../shared/outputLanguageLock.js'
import { isServerlessRuntime } from './runtime.js'
import {
  serverlessMaxScriptScenes,
  scriptSceneCountInstruction,
  sceneCountRangeForInput,
  ABSOLUTE_MIN_SCENES
} from './sceneCountPolicy.js'
import { storyBeatStructurePromptBlock } from '../../shared/storySceneBeats.js'
import {
  characterPersonalityWritingBlock,
  cinematicWritingBlueprintSection,
  screenplayQualityRulesBlock,
  cinematicDirectionBlock,
  dialogueDurationBlock
} from '../cinematic/cinematicStoryWriting.js'
import { dialogueDensityForInput, effectiveMinScenes } from './sceneCountPolicy.js'

function longStoryScriptSection(inputLike) {
  const plan = inputLike?.__longStoryIntelligence
  if (!plan?.active) return ''
  const outline = plan?.tokenBudget?.scriptContext || ''
  const density = dialogueDensityForInput(inputLike)
  return `
LONG-STORY SCENE PLAN (mandatory):
- ${scriptSceneCountInstruction(inputLike)}
${storyBeatStructurePromptBlock(effectiveMinScenes(inputLike))}
- Each scene is DIALOGUE-DRIVEN: ${Math.max(8, density.min)}-${density.max} dialogue/narration entries (target ~${density.preferred}); 70–85% dialogue, narration short and connective.
- visual_description per scene: 2–3 rich filmable sentences (environment, light, body language, camera-friendly staging) for downstream illustration — NO readable text, speech bubbles, or captions in frame (Katha renders dialogue separately).
- Avoid repeated narration lines and emotional resets between scenes; vary sentence openings and rhythm.
${outline ? `Planned beats:\n${outline}\n` : ''}`
}

function blueprintPreamble(inputLike) {
  const block = String(inputLike?.__generationBlueprint || '').trim()
  const repair = String(inputLike?.blueprintRepairNotes || '').trim()
  const directives = String(inputLike?.__productionDirectivesBlock || '').trim()
  const regional = regionalCultureContextLine(
    inputLike?.storyLanguage,
    inputLike?.country
  )
  const englishLock = englishOutputEnforcementBlock(regional)
  if (!block && !repair && !directives) return `${englishLock}\n\n`
  let out = `${englishLock}\n\n`
  if (directives) {
    out += `${directives}\n\n`
  }
  if (block) {
    out += `=== GENERATION BLUEPRINT (HARD LOCKS — obey before any improvisation) ===\n${block}\n=== END BLUEPRINT ===\n\n`
  }
  if (repair) {
    out += `BLUEPRINT QC REPAIR — correct ONLY these violations; preserve every other lock:\n${repair}\n\n`
  }
  return out
}

export function buildStoryPrompt(inputLike) {
  const preamble = blueprintPreamble(inputLike)
  const {
    theme,
    country,
    region,
    genre,
    length,
    memory,
    forceVariation,
    styleId,
    customVisualPrompt,
    visualAccent,
    seedLine,
    storyLanguage
  } = inputLike
  const langDisp = OUTPUT_LANGUAGE
  const regionalAtmosphere =
    String(inputLike?.__regionalContextDisplay || '').trim() ||
    regionalCultureContextLine(inputLike?.storyLanguage, inputLike?.country)
  const mem = summarizeMemory(memory)
  const variation = forceVariation
    ? `\nHARD VARIATION REQUIRED:\n- Use different setting type, conflict type, and character archetypes than recent.\n- Use an unexpected but culturally plausible hook.\n`
    : ''

  const visualToneLine = buildStoryStyleHintLine({
    styleId,
    customVisualPrompt,
    visualAccent,
    theme,
    seedLine
  })

  const cinematicWrite = cinematicWritingBlueprintSection({
    genre,
    storyTone: inputLike?.storyTone,
    __storyLanguageDisplay: langDisp,
    storyLanguage
  })

  return `${preamble}Generate a UNIQUE, culturally authentic ${genre} ${theme} story grounded in ${country} (${region}).

${cinematicWrite}

Constraints:
- Follow the GENERATION BLUEPRINT locks above first; they override latent defaults.
- Primary prose language: ${langDisp} ONLY — title, setting, story prose, and any inline dialogue must be ${langDisp} (regional atmosphere: ${regionalAtmosphere} for culture/names/traditions, not for script alphabet).
- 100% original. No copying or recognizable IP.
- Cultural authenticity: include believable details (places, customs) without stereotyping. Only use personal names if USER SEED / NAMING LOCK allows names; otherwise pronouns and relationship words only.
- Strict logical consistency (timeline, motivations, causal chain).
- Avoid repetition vs memory below.
- Length: ${length} (short≈900-1400 words, medium≈1400-2200, long≈2200-3500, epic≈3500+) — write a RICH story, never a compressed summary.
- DIALOGUE-DRIVEN: carry the plot through characters talking, discovering, arguing, questioning, and revealing — not through narrator summary. The downstream screenplay must be 70–85% dialogue, so write abundant, distinct, quotable spoken exchanges into the prose.
- Structure the prose in chapters/scenes with clear progression so it can be broken into many cinematic scenes (travel/transition beats between locations — never teleport characters).
- Story prose: cinematic audiobook quality — sensory atmosphere, emotional interiority, natural human rhythm; NOT flat AI summary.
- Show don't tell: reveal emotion through action, gesture, environment, and dialogue — never label feelings without behavior.
- Plot: strong opening hook, rising conflict, clear climax, satisfying resolution — motivations and consequences visible.
- Emotional arc: curiosity → escalation → peak intensity → resolution; no flat emotional plateau across the whole story.
- Dialogue in story prose: when characters speak, give them distinct voices, natural hesitation, and meaningful exchanges (visual novel / animated-film realism).
- Character appearance in prose: when describing people, include region-appropriate ethnicity, dress, and features matching ${country} / ${regionalAtmosphere} — never generic unrelated Western defaults unless story demands.
- Illustrated adaptation tone (keep prose compatible with downstream visuals): ${visualToneLine}
${variation}

Memory (recent fingerprints & banned repeats):
${mem}

Return JSON ONLY with EXACT keys:
{
  "title": string,
  "setting": string,
  "characters": [ { "name": string, "role": string, "traits": string } ],
  "story": string
}`
}

export function buildValidationPrompt({ story, input, region }) {
  const preamble = blueprintPreamble(input)
  const langDisp = OUTPUT_LANGUAGE
  const regionalAtmosphere =
    String(input?.__regionalContextDisplay || '').trim() ||
    regionalCultureContextLine(input?.storyLanguage, input?.country)
  return `${preamble}You will validate a story for logic and consistency.

Input metadata:
- country: ${input.country}
- region: ${region}
- theme: ${input.theme}
- genre: ${input.genre}
- locked prose/dialogue language: ${langDisp}
- regional cultural atmosphere (not output language): ${regionalAtmosphere}

Rules:
- Honor GENERATION BLUEPRINT locks: do not relocate setting to a different culture than locked region unless USER SEED explicitly demands it.
- Preserve dominant language ${langDisp}; if any field uses non-English script, rewrite that field into ${langDisp} while keeping regional culture.
- DO NOT rewrite creatively or swap genres (no injecting comedy beats into non-comedy locks, etc.).
- Fix contradictions, timeline issues, character inconsistency, unclear causality.
- Remove redundancy and repeated lines.
- Flag and fix robotic dialogue, identical character voices, and tell-not-show emotion labels (replace with visible behavior).
- Keep culture and meaning unchanged.

Return JSON ONLY with EXACT keys (same as story schema):
{
  "title": string,
  "setting": string,
  "characters": [ { "name": string, "role": string, "traits": string } ],
  "story": string
}

STORY JSON:
${JSON.stringify(story)}`
}

export function buildEnhancementPrompt({ story, input, region }) {
  const preamble = blueprintPreamble(input)
  const langDisp = OUTPUT_LANGUAGE
  const regionalAtmosphere =
    String(input?.__regionalContextDisplay || '').trim() ||
    regionalCultureContextLine(input?.storyLanguage, input?.country)
  return `${preamble}You will enhance a story for cultural richness and immersion.

Input metadata:
- country: ${input.country}
- region: ${region}
- theme: ${input.theme}
- genre: ${input.genre}
- locked prose/dialogue language: ${langDisp}
- regional cultural atmosphere (not output language): ${regionalAtmosphere}

Rules:
- Obey GENERATION BLUEPRINT locks: never contradict genre, region, language, or USER SEED priorities.
- Do NOT paste unrelated tonal additives (e.g., slapstick, rom-com banter, Hollywood teaser clichés) unless GENRE/SEED explicitly blends them.
- Do NOT change core plot meaning, major events, or outcomes.
- Deepen dialogue while staying in ${langDisp} — natural human speech, distinct character voices, longer meaningful exchanges, interruptions and reactions; never robotic or overly formal.
- Show don't tell: replace emotion labels with visible behavior, environment, and subtext.
- Expand emotional moments with sensory detail (weather, silence, faces, gestures, sound) where it heightens immersion; remove robotic filler.
- Target 2–3× richer scene-level prose in the story body where beats warrant depth — professional animated-feature / visual-novel quality.
- Add culturally grounded details (food, architecture, social norms, folklore texture) without stereotypes.
- Keep logical consistency and smooth emotional flow between paragraphs.

Return JSON ONLY with EXACT keys (same as story schema):
{
  "title": string,
  "setting": string,
  "characters": [ { "name": string, "role": string, "traits": string } ],
  "story": string
}

STORY JSON:
${JSON.stringify(story)}`
}

export function buildScriptPrompt({ story, input, region }) {
  const visualLock = buildScriptVisualStyleSection(input)
  const preamble = blueprintPreamble(input)
  const langDisp = OUTPUT_LANGUAGE
  const masterBlock = String(input?.__masterStoryContextBlock || '').trim()
  const regionalNote = input?.__regionalContextDisplay
    ? `Regional atmosphere (culture while writing in ${langDisp}): ${input.__regionalContextDisplay}.`
    : ''
  const castBlock = characterPersonalityWritingBlock(story?.characters || [])
  const cinematicWrite = cinematicWritingBlueprintSection({
    genre: input?.genre,
    storyTone: input?.storyTone,
    __storyLanguageDisplay: langDisp,
    storyLanguage: input?.storyLanguage,
    length: input?.length || input?.storyLength,
    seriesMode: input?.seriesMode || input?.isSeries || input?.__seriesMode,
    epicMode: input?.epicMode || input?.__epicMode
  })
  const density = dialogueDensityForInput(input)

  return `${preamble}Convert this story into a rich, dialogue-driven cinematic screenplay — animated-film / mystery-drama / visual-novel quality. Each scene plays for roughly 30–90 seconds, NOT a compressed summary.

${masterBlock ? `${masterBlock}\n\n` : ''}${cinematicWrite}

${castBlock ? `${castBlock}\n\n` : ''}${regionalNote ? `${regionalNote}\n\n` : ''}Metadata:
- country: ${input.country}
- region: ${region}
- theme: ${input.theme}
- genre: ${input.genre}
- narration + dialogue language lock: ${langDisp} (regional culture only — never regional script in JSON fields)

${visualLock}

${longStoryScriptSection(input)}

${storyBeatStructurePromptBlock(effectiveMinScenes(input))}

${screenplayQualityRulesBlock(langDisp)}

${cinematicDirectionBlock()}

${dialogueDurationBlock()}

Rules:
- Follow GENERATION BLUEPRINT locks (genre, region, pacing, visual card).
- ${scriptSceneCountInstruction(input)}
- DIALOGUE-FIRST: 70–85% dialogue, 15–30% narration per scene. Do NOT summarize key events in narration — let characters say, discover, argue, question, and reveal them.
- Each scene must include:
  - scene (number)
  - scene_title (short evocative title)
  - location, time_of_day, weather, lighting, mood (concise strings — feed the cinematic director)
  - visual_description (3–5 rich filmable sentences: who is visible with locked appearance, positions, pose, action, expression, important objects, camera-friendly composition — NEVER title-only; NO text/subtitles/captions in frame)
  - narration (SHORT cinematic voiceover for TTS — 1–3 sentences, atmosphere/transition only; show-don't-tell; NOT a plot summary)
  - narration_duration (estimated spoken seconds for the narration, e.g. 4.8)
  - dialogue (array of { character, line, duration } — natural human conversation: ${Math.max(8, density.min)}-${density.max} entries per scene with back-and-forth, distinct voices, questions, reactions, hesitation, interruptions; "duration" is estimated spoken seconds for that line, e.g. 2.4). Empty array ONLY for a deliberate pure-voiceover montage scene.
- A scene that is only 1–3 dialogue lines is FORBIDDEN — develop the conversation and emotional progression.
- Travel/transition: never teleport characters between distant locations; write intermediate scenes (e.g. Village → Forest Path → River Crossing → Castle).
- Write narration and every dialogue line in ${langDisp} unless USER SEED explicitly authorizes bilingual delivery (${langDisp} remains primary).
- Narration carries atmosphere; dialogue carries plot and distinct character voice — do not duplicate the same information in both.
- Every scene needs clear purpose, plot/emotional progression, and a micro-turn ending; no filler vignettes.
- Emotional flow: each scene's tone must follow logically from the previous scene (build-up, peak, cooldown); let key moments breathe.
- For mystery/thriller/horror/fantasy/adventure: spread clues across scenes, add red herrings, delay reveals, build multiple twists — never solve it immediately.
- Anti-AI phrasing: avoid "In a surprising turn", "Little did they know", "The air was thick with tension" every scene — vary language.
- Ensure continuity across scenes. Keep it original; do not add copyrighted references.

Return JSON ONLY as an array with this shape (extra fields allowed; "duration"/"narration_duration" are seconds as numbers):
[
  {
    "scene": 1,
    "scene_title": string,
    "location": string,
    "time_of_day": string,
    "weather": string,
    "lighting": string,
    "mood": string,
    "visual_description": string,
    "narration": string,
    "narration_duration": number,
    "dialogue": [ { "character": string, "line": string, "duration": number } ]
  }
]

STORY JSON:
${JSON.stringify(story)}`
}

