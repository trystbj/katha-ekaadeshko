import { summarizeMemory } from './memoryStore.js'
import { buildStoryStyleHintLine, buildScriptVisualStyleSection } from './visualStyleLock.js'
import {
  OUTPUT_LANGUAGE,
  englishOutputEnforcementBlock,
  regionalCultureContextLine
} from '../../shared/outputLanguageLock.js'
import { isServerlessRuntime } from './runtime.js'
import { serverlessMaxScriptScenes } from './serverlessSceneLimits.js'
import {
  characterPersonalityWritingBlock,
  cinematicWritingBlueprintSection,
  screenplayQualityRulesBlock
} from '../cinematic/cinematicStoryWriting.js'

function longStoryScriptSection(inputLike) {
  const plan = inputLike?.__longStoryIntelligence
  if (!plan?.active) return ''
  const raw = plan.structure?.targetSceneCount || plan.targetSceneCount || 8
  const n = Math.min(10, Math.max(6, Number(raw) || 8))
  const outline = plan.tokenBudget?.scriptContext || ''
  return `
LONG-STORY SCENE PLAN (mandatory):
- Produce between 6 and ${n} scenes (prefer the upper end when the story supports it; stay within this range so JSON stays valid).
- Honor scene emotional beats and continuity from the seed analysis.
- Each scene: cinematic narration (typically 3–6 sentences when emotional beats need depth; show-don't-tell) + natural dialogue exchanges in dialogue[] (3–8 lines when characters interact; not one-liner robots).
- visual_description per scene: 2–3 rich filmable sentences (environment, light, body language, camera-friendly staging) for downstream illustration.
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
- Length: ${length} (short≈600-900 words, medium≈900-1400, long≈1400-2000).
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
    storyLanguage: input?.storyLanguage
  })

  return `${preamble}Convert this story into a cinematic short-form screenplay suitable for 40s–2min video.

${masterBlock ? `${masterBlock}\n\n` : ''}${cinematicWrite}

${castBlock ? `${castBlock}\n\n` : ''}${regionalNote ? `${regionalNote}\n\n` : ''}Metadata:
- country: ${input.country}
- region: ${region}
- theme: ${input.theme}
- genre: ${input.genre}
- narration + dialogue language lock: ${langDisp} (regional culture only — never regional script in JSON fields)

${visualLock}

${longStoryScriptSection(input)}

${screenplayQualityRulesBlock(langDisp)}

Rules:
- Follow GENERATION BLUEPRINT locks (genre, region, pacing, visual card).
- ${isServerlessRuntime() ? `Produce exactly ${serverlessMaxScriptScenes(input)} scenes (server-optimized batch — quality over quantity).` : '6–10 scenes (use LONG-STORY SCENE PLAN count when provided above).'}
- Each scene must include:
  - scene (number)
  - visual_description (3–5 rich filmable sentences: location, weather/time, atmosphere, who is visible with locked appearance, pose, action, expression, story event, camera-friendly composition — NEVER title-only; NO text/subtitles/captions in frame)
  - narration (cinematic voiceover for TTS — show-don't-tell; typically 4–7 sentences on key beats, 3–5 on brief beats; sensory + emotional depth; NOT robotic list tone)
  - dialogue (array of { character, line } — natural human conversation when characters interact: typically 4–10 lines with back-and-forth, distinct voices, reactions, hesitation, interruptions; empty array ONLY for pure voiceover)
- Write narration and every dialogue line in ${langDisp} unless USER SEED explicitly authorizes bilingual delivery (${langDisp} remains primary).
- Narration carries atmosphere and visible emotion; dialogue carries distinct character voice — do not duplicate the same information in both.
- Every scene needs clear purpose, plot/emotional progression, and a micro-turn ending; no filler vignettes.
- Emotional flow: each scene's tone must follow logically from the previous scene (build-up, peak, cooldown); let key moments breathe.
- Anti-AI phrasing: avoid "In a surprising turn", "Little did they know", "The air was thick with tension" every scene — vary language.
- Ensure continuity across scenes.
- Keep it original; do not add copyrighted references.

Return JSON ONLY as an array with this shape:
[
  {
    "scene": 1,
    "visual_description": string,
    "narration": string,
    "dialogue": [ { "character": string, "line": string } ]
  }
]

STORY JSON:
${JSON.stringify(story)}`
}

