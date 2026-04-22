import { summarizeMemory } from './memoryStore.js'

export function buildStoryPrompt({ theme, country, region, genre, length, memory, forceVariation }) {
  const mem = summarizeMemory(memory)
  const variation = forceVariation
    ? `\nHARD VARIATION REQUIRED:\n- Use different setting type, conflict type, and character archetypes than recent.\n- Use an unexpected but culturally plausible hook.\n`
    : ''

  return `Generate a UNIQUE, culturally authentic ${genre} ${theme} story grounded in ${country} (${region}).

Constraints:
- 100% original. No copying or recognizable IP.
- Cultural authenticity: include believable details (names, places, customs) without stereotyping.
- Strict logical consistency (timeline, motivations, causal chain).
- Avoid repetition vs memory below.
- Length: ${length} (short≈600-900 words, medium≈900-1400, long≈1400-2000).
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
  return `You will validate a story for logic and consistency.

Input metadata:
- country: ${input.country}
- region: ${region}
- theme: ${input.theme}
- genre: ${input.genre}

Rules:
- DO NOT rewrite creatively.
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
  return `You will enhance a story for cultural richness and immersion.

Input metadata:
- country: ${input.country}
- region: ${region}
- theme: ${input.theme}
- genre: ${input.genre}

Rules:
- Do NOT change core plot meaning, major events, or outcomes.
- Improve dialogue and atmosphere.
- Add culturally grounded details (food, architecture, social norms, folklore texture) without stereotypes.
- Keep logical consistency.

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
  return `Convert this story into a cinematic short-form script suitable for 40s–2min video.

Metadata:
- country: ${input.country}
- region: ${region}
- theme: ${input.theme}
- genre: ${input.genre}

Rules:
- 6–10 scenes.
- Each scene must include:
  - scene (number)
  - visual_description (shot + key actions + setting)
  - narration (voiceover; main content for TTS)
  - dialogue (short lines; optional)
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

