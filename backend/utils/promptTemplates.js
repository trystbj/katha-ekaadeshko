import { summarizeMemory } from './memoryStore.js'
import { buildStoryStyleHintLine, buildScriptVisualStyleSection } from './visualStyleLock.js'
import { languageDisplayName } from './generationBlueprint.js'
import {
  characterPersonalityWritingBlock,
  cinematicWritingBlueprintSection
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
- Each scene: cinematic narration (may be 2–5 sentences when emotional beats need depth) + 0–3 natural dialogue lines in dialogue[].
- Avoid repeated narration lines and emotional resets between scenes; vary sentence openings and rhythm.
${outline ? `Planned beats:\n${outline}\n` : ''}`
}

function blueprintPreamble(inputLike) {
  const block = String(inputLike?.__generationBlueprint || '').trim()
  const repair = String(inputLike?.blueprintRepairNotes || '').trim()
  if (!block && !repair) return ''
  let out = ''
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
  const langDisp =
    String(inputLike?.__storyLanguageDisplay || '').trim() ||
    languageDisplayName(storyLanguage || inputLike?.storyLanguage)
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
- Primary prose language: ${langDisp} — title, setting, story prose, and any inline dialogue must stay in this language unless the USER SEED explicitly permits bilingualism (${langDisp} still dominant).
- 100% original. No copying or recognizable IP.
- Cultural authenticity: include believable details (places, customs) without stereotyping. Only use personal names if USER SEED / NAMING LOCK allows names; otherwise pronouns and relationship words only.
- Strict logical consistency (timeline, motivations, causal chain).
- Avoid repetition vs memory below.
- Length: ${length} (short≈600-900 words, medium≈900-1400, long≈1400-2000).
- Story prose: cinematic audiobook quality — sensory atmosphere, emotional interiority, natural human rhythm; NOT flat AI summary.
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
  const langDisp =
    String(input?.__storyLanguageDisplay || '').trim() ||
    languageDisplayName(input?.storyLanguage)
  return `${preamble}You will validate a story for logic and consistency.

Input metadata:
- country: ${input.country}
- region: ${region}
- theme: ${input.theme}
- genre: ${input.genre}
- locked prose/dialogue language: ${langDisp}

Rules:
- Honor GENERATION BLUEPRINT locks: do not relocate setting to a different culture than locked region unless USER SEED explicitly demands it.
- Preserve dominant language ${langDisp}; do not translate everything into English unless ${langDisp} already is English.
- DO NOT rewrite creatively or swap genres (no injecting comedy beats into non-comedy locks, etc.).
- Fix contradictions, timeline issues, character inconsistency, unclear causality.
- Remove redundancy and repeated lines.
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
  const langDisp =
    String(input?.__storyLanguageDisplay || '').trim() ||
    languageDisplayName(input?.storyLanguage)
  return `${preamble}You will enhance a story for cultural richness and immersion.

Input metadata:
- country: ${input.country}
- region: ${region}
- theme: ${input.theme}
- genre: ${input.genre}
- locked prose/dialogue language: ${langDisp}

Rules:
- Obey GENERATION BLUEPRINT locks: never contradict genre, region, language, or USER SEED priorities.
- Do NOT paste unrelated tonal additives (e.g., slapstick, rom-com banter, Hollywood teaser clichés) unless GENRE/SEED explicitly blends them.
- Do NOT change core plot meaning, major events, or outcomes.
- Deepen dialogue and atmosphere while staying in ${langDisp} — make lines sound spoken, emotionally believable, relationship-aware.
- Expand emotional moments with sensory detail (weather, silence, faces, gestures) where it heightens immersion; remove robotic filler.
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
  const langDisp =
    String(input?.__storyLanguageDisplay || '').trim() ||
    languageDisplayName(input?.storyLanguage)
  const castBlock = characterPersonalityWritingBlock(story?.characters || [])
  const cinematicWrite = cinematicWritingBlueprintSection({
    genre: input?.genre,
    storyTone: input?.storyTone,
    __storyLanguageDisplay: langDisp,
    storyLanguage: input?.storyLanguage
  })

  return `${preamble}Convert this story into a cinematic short-form screenplay suitable for 40s–2min video.

${cinematicWrite}

${castBlock ? `${castBlock}\n\n` : ''}Metadata:
- country: ${input.country}
- region: ${region}
- theme: ${input.theme}
- genre: ${input.genre}
- narration + dialogue language lock: ${langDisp}

${visualLock}

${longStoryScriptSection(input)}

Rules:
- Follow GENERATION BLUEPRINT locks (genre, region, pacing, visual card).
- 6–10 scenes (use LONG-STORY SCENE PLAN count when provided above).
- Each scene must include:
  - scene (number)
  - visual_description (shot + key actions + setting + visible emotion/body language)
  - narration (cinematic voiceover for TTS — immersive, emotional, varied rhythm; 1–4 sentences; NOT robotic list tone)
  - dialogue (array of { character, line } — natural spoken lines when characters talk; include reactions, interruptions, questions; empty array only if scene is pure voiceover)
- Write narration and every dialogue line in ${langDisp} unless USER SEED explicitly authorizes bilingual delivery (${langDisp} remains primary).
- Narration carries atmosphere; dialogue carries character voice — do not duplicate the same information in both.
- Emotional flow: each scene's tone must follow logically from the previous scene (build-up, peak, cooldown).
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

