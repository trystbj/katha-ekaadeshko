import type { AspectMode, ProjectState, StoryBible, VisualStyleId } from '../types/story'
import { STYLE_PRESETS } from '../types/story'

export const CORE_STORY_RULES = `You are the structured storytelling engine for "कथा एकादेशको".
You are NOT a free-form chatbot.

MANDATES:
- Maintain continuity with provided memory and bible. Never contradict locked facts.
- Avoid repetition vs. listed fingerprints: do not reuse same beats, lines, or twist patterns.
- Original fiction only: do not copy or closely imitate existing published works, franchises, or recognizable characters.
- Optimize beats for short-form vertical/horizontal video: clear visual staging, readable emotion, punchy rhythm.
- Output ONLY in the requested structured format. No unstructured prose outside the template.
- Dialogue: spoken lines only. Thoughts: optional inner voice with at most ONE emoji when truly needed; never spam emoji.
- Every episode MUST end with a concrete cliffhanger line (hook), separate from scenes.`

export function buildBibleUserPrompt(params: {
  idea: string
  styleId: VisualStyleId
  languageName: string
  aspectMode: AspectMode
}): string {
  const style = STYLE_PRESETS[params.styleId].promptSuffix
  return `User idea (seed): ${params.idea}

Target language for all titles, names transliteration if needed, and episode text: ${params.languageName}
Visual style injection (for prompts later): ${style}
Aspect default: ${params.aspectMode} (influence composition hints in outline only).

Return a single JSON object inside a markdown code block (\`\`\`json ... \`\`\`) with EXACT keys:
{
  "title": string,
  "concept": string (2-4 sentences),
  "totalEpisodes": number (integer 15-25 inclusive),
  "characters": [
    {
      "id": "c1",
      "name": string,
      "personality": string,
      "visualIdentity": string (hair, eyes, outfit anchors — stable),
      "baseImagePrompt": string (one paragraph, style-agnostic anchors + "${style}")
    }
  ],
  "outline": [ { "episode": number, "beat": string } ]  // one row per episode, 1-2 sentences each
}

Rules:
- 3-8 main characters with unique voices.
- Outline must escalate across episodes and reserve a strong finale.
- totalEpisodes must match outline length.
`
}

export function parseBibleJson(text: string): StoryBible | null {
  const m = text.match(/```json\s*([\s\S]*?)```/i)
  const raw = m ? m[1] : text
  try {
    const o = JSON.parse(raw.trim()) as {
      title?: string
      concept?: string
      totalEpisodes?: number
      characters?: {
        id: string
        name: string
        personality: string
        visualIdentity: string
        baseImagePrompt: string
      }[]
      outline?: { episode: number; beat: string }[]
    }
    if (!o.title || !o.concept || !o.characters?.length || !o.outline?.length) return null
    const n = Math.min(25, Math.max(15, o.totalEpisodes ?? o.outline.length))
    return {
      title: o.title,
      concept: o.concept,
      characters: o.characters.map((c, i) => ({
        id: c.id || `c${i + 1}`,
        name: c.name,
        personality: c.personality,
        visualIdentity: c.visualIdentity,
        baseImagePrompt: c.baseImagePrompt
      })),
      totalEpisodes: n,
      outline: o.outline.slice(0, n),
      userIdea: '',
      styleId: 'soft_anime_fantasy',
      language: '',
      aspectMode: 'vertical_9_16'
    }
  } catch {
    return null
  }
}

export function buildEpisodeUserPrompt(project: ProjectState, episodeNumber: number): string {
  const bible = project.bible
  if (!bible) throw new Error('Bible missing')

  const epMeta = bible.outline.find((e) => e.episode === episodeNumber)
  const prev = project.episodes
    .filter((e) => e.number < episodeNumber)
    .map((e) => `E${e.number}: ${e.cliffhanger}`)
    .slice(-4)
    .join('\n')

  const fingerprints = project.contentFingerprints.slice(-24).join(' | ')

  return `Generate EPISODE ${episodeNumber} of ${bible.totalEpisodes}.

Bible title: ${bible.title}
Concept: ${bible.concept}

Characters (keep voices consistent):
${bible.characters.map((c) => `- ${c.name} (${c.id}): ${c.personality}; look: ${c.visualIdentity}`).join('\n')}

Planned beat for this episode:
${epMeta?.beat ?? '(advance plot faithfully)'}

Memory summary (canonical):
${project.memorySummary || '(none yet)'}

Recent cliffhangers:
${prev || '(none)'}

Anti-repetition fingerprints (avoid similar phrasing or twists):
${fingerprints || '(none)'}

Duration policy (pick estimated duration accordingly):
- Emotional or Climax scenes → longer (90-120s)
- Action → shorter (40-70s)
- Normal → medium (60-90s)

Structure EVERY episode with 4-10 scenes. Use ONLY this template (no extra paragraphs):

Episode: ${episodeNumber}
Type: <Action|Emotional|Normal|Climax>
Estimated Duration: <NNs> (40-120)

Scene 1:
Type: <Dialogue|Thought>
Character: <name>
Text: <line>
Scene 2:
Type: Dialogue
Character: ...
Text: ...
...
Cliffhanger: <one sharp hook line>

For Thought lines, you may append on the next line:
Emoji: <single emoji or omit>

If Type is Thought, Text is inner monologue; still set Character to who thinks it.
`
}

export function buildMemoryUpdatePrompt(project: ProjectState, newEpisodeBlock: string): string {
  return `Compress story memory AFTER this episode. Return 6-10 bullet lines, canonical facts only.

Previous memory:
${project.memorySummary || '(empty)'}

New episode structured script:
${newEpisodeBlock}

Output format: bullet list lines starting with "- ", no JSON, no code fences.`
}

export function buildOpenAIRefinePrompt(structuredEpisode: string): string {
  return `You polish dialogue for emotional clarity and distinct character voice. 
Keep the EXACT same template fields and order. Do not add scenes. Do not remove Cliffhanger line.
Do not change Episode number, Type, or Estimated Duration except fix obvious typos.

INPUT:
${structuredEpisode}

OUTPUT: full corrected episode in the same structured format only.`
}

export function recommendStyleFromIdea(idea: string): VisualStyleId {
  const s = idea.toLowerCase()
  if (/love|romance|heart|wedding|kiss/i.test(s)) return 'romantic_glow'
  if (/horror|dark|blood|nightmare|shadow/i.test(s)) return 'dark_anime'
  if (/fight|battle|war|ninja|mech|speed/i.test(s)) return 'cinematic_anime'
  if (/comic|funny|gag|slice/i.test(s)) return 'comic_panel'
  if (/magic|fairy|realm|dragon|soft/i.test(s)) return 'soft_anime_fantasy'
  return 'cinematic_anime'
}
