import type { AspectMode, ProjectState, StoryBible, VisualStyleId } from '../types/story'
import { getStylePromptSuffix } from '../types/story'
import { narratorIdentityForId } from '../constants/narratorVoiceProfiles'

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

function hybridBlendRequested(...parts: (string | undefined)[]): boolean {
  const blob = parts.filter(Boolean).join(' ')
  return /\b(blend(ing)?\s+styles|style\s+blend|hybrid\s+(style|look|aesthetic)|mixed\s+media\s+art|combine\s+realistic\s+and|mix\s+anime\s+and\s+live|photoreal\s*\+\s*cartoon)\b/i.test(
    blob
  )
}

export function buildBibleUserPrompt(params: {
  idea: string
  styleId: VisualStyleId
  /** Required when `styleId` is `custom`. */
  customVisualPrompt?: string
  languageName: string
  aspectMode: AspectMode
  /** Nepal theme-pack mood line merged into visual guidance. */
  visualAccent?: string
}): string {
  const hybrid = hybridBlendRequested(params.idea, params.customVisualPrompt, params.visualAccent)
  const style = getStylePromptSuffix(params.styleId, params.customVisualPrompt)
  const accent = params.visualAccent?.trim()
  let injected = style
  if (accent && accent.length > 0) {
    injected = hybrid
      ? `${style} Layered mood / aesthetic cues (hybrid explicitly requested — fuse thoughtfully): ${accent}`
      : `${style} Ambient mood accent ONLY — must NOT replace or contradict the locked rendering medium above: ${accent}`
  }
  return `User idea (seed): ${params.idea}

Target language for all titles, names transliteration if needed, and episode text: ${params.languageName}
Visual style injection (LOCKED — reuse verbatim inside each character baseImagePrompt): ${injected}
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
      "baseImagePrompt": string (one paragraph; stable character anchors + the full visual style injection line above)
    }
  ],
  "outline": [ { "episode": number, "beat": string } ]  // one row per episode, 1-2 sentences each
}

Rules:
- 3-8 main characters with unique voices.
- Outline must escalate across episodes and reserve a strong finale.
- totalEpisodes must match outline length.
- CRITICAL: Each character baseImagePrompt must begin by restating the SAME rendering-medium keywords as the visual style injection line (no contradictory render directions).${
    hybrid ? ' Hybrid layering is permitted because the user requested blending.' : ''
  }
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

  const narratorIdentity = narratorIdentityForId(bible.narratorId ?? '')
  const narratorIdentityHint = narratorIdentity
    ? `Gender: ${narratorIdentity.gender}; age: ${narratorIdentity.ageProfile}; depth: ${narratorIdentity.voiceDepth}; pitch: ${narratorIdentity.pitchRange}; resonance: ${narratorIdentity.resonance}; texture: ${narratorIdentity.breathTexture}; cadence: ${narratorIdentity.narrationCadence}; accent: ${narratorIdentity.accentProfile}; style: ${narratorIdentity.storytellingStyle}; emotional range: ${narratorIdentity.emotionalRange}; cinematic intensity: ${narratorIdentity.cinematicIntensity}.
Performance profiles:
- Whisper: ${narratorIdentity.whisperProfile}
- Calm: ${narratorIdentity.calmProfile}
- Suspense: ${narratorIdentity.suspenseProfile}
- Shouting: ${narratorIdentity.shoutingProfile}
${narratorIdentity.epicProfile ? `- Epic/Myth: ${narratorIdentity.epicProfile}` : ''}${narratorIdentity.warmthSoftnessProfile ? `\n- Warmth/Softness: ${narratorIdentity.warmthSoftnessProfile}` : ''}`
    : null

  const narration = project.narration ?? bible.narration
  const narrationLine = narration
    ? `- Narration target: ${narration.languageId} · voice mode: adaptive auto — accent, pacing, emotion, and mixing derive from narration language, bible genre/mood, scene text, and character cues (no manual prosody controls).${
        narration.ai?.autoTranslateToNarrationLanguage ? ' · auto-translate ON' : ''
      }${narration.ai?.preserveOriginalProperNames ? ' · preserve proper names ON' : ''}${
        narration.ai?.generateSubtitlesAutomatically ? ' · auto-subs ON' : ''
      }${narration.ai?.dualSubtitleMode ? ' · dual-subs ON' : ''}${
        narration.ai?.lipSyncDialogueWithSelectedLanguage ? ' · lip-sync ON' : ''
      }${narration.ai?.multiNarratorMode ? ' · multi-narrator ON' : ''}${
        narration.ai?.episodeNarratorConsistencyLock ? ' · narrator-lock ON' : ''
      }`
    : null

  const epMeta = bible.outline.find((e) => e.episode === episodeNumber)
  const prev = project.episodes
    .filter((e) => e.number < episodeNumber)
    .map((e) => `E${e.number}: ${e.cliffhanger}`)
    .slice(-4)
    .join('\n')

  const fingerprints = project.contentFingerprints.slice(-24).join(' | ')
  const narratorLock = bible.narratorId?.trim() || '(match bible / studio narrator preset)'
  const styleLock = `${bible.styleId}${bible.styleId === 'custom' && bible.customVisualPrompt?.trim() ? ` — ${bible.customVisualPrompt.trim()}` : ''}`
  const dialogueLang = bible.language?.trim() || '(story language from bible)'

  return `Generate EPISODE ${episodeNumber} of ${bible.totalEpisodes}.

Bible title: ${bible.title}
Concept: ${bible.concept}

Continuity locks (do not reset between episodes):
- Narrator / voice preset id: ${narratorLock}
- Narrator language & voice intent: ${narrationLine ?? '(use studio narrator settings if present)'}
- Built-in narrator identity (LOCKED voiceprint; adapt performance without changing identity): ${narratorIdentityHint ?? '(use the selected built-in narrator identity)'}
- Visual medium lock: ${styleLock}
- Spoken / on-screen language: ${dialogueLang}
- Preserve character faces, relationships, setting, subtitle cadence, music beds / ambient mood direction when referenced in memory.

Performance logic requirements (do NOT change the narrator identity):
- Adapt delivery per scene mood, tension, whisper/scream/calm/epic states, and narration context.
- Adapt dialogue delivery per character gender/age/personality and emotional state, but keep a recognizable “vocal family” anchored to the selected narrator.
- If multi narrator mode is requested, cast distinct character variations that do NOT sound like duplicates while preserving family similarity and consistent quality.

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

/** Keyword hints for studio chips when the seed is long enough (4+ chars). */
export function recommendGenreFromIdea(idea: string): string {
  const s = idea.toLowerCase()
  if (/love|romance|heart|wedding|kiss|relationship/i.test(s)) return 'love'
  if (/comedy|humou?r|funny|satire|parody|sitcom|laugh|comedic/i.test(s)) return 'comedy'
  if (/young adult|\bya\b|teen protagonist|high school arc|coming-of-age/i.test(s)) return 'young-adult'
  if (/ghost|haunt|spirit|curse|supernatural|occult/i.test(s)) return 'supernatural'
  if (/horror|blood|nightmare|terror|fear|monster/i.test(s)) return 'horror'
  if (/\bnoir\b|hardboiled|neo-noir|femme fatale/i.test(s)) return 'noir'
  if (/detective|murder|clue|whodunit|investigation|crime scene/i.test(s)) return 'mystery'
  if (/heist|gangster|mafia|cartel|organized crime|prison break|mob boss/i.test(s)) return 'crime'
  if (/thriller|conspiracy|assassin|hostage|espionage/i.test(s)) return 'thriller'
  if (/\baction\b|gunfight|explosion|chase scene|special forces|shootout|battle royale/i.test(s)) return 'action'
  if (/space|robot|ai\b|future|colony|alien|starship/i.test(s)) return 'sci-fi'
  if (/slice of life|everyday life|mundane|quiet slice|coffee shop slice/i.test(s)) return 'slice-of-life'
  if (/dragon|magic|wizard|realm|quest|fairy|enchant/i.test(s)) return 'fantasy'
  if (/village|ancestor|oral|tradition|old gods|folk tale/i.test(s)) return 'folklore'
  if (/king|empire|battle of |historical|dynasty|century/i.test(s)) return 'historical'
  if (/journey|treasure|expedition|explore|wilderness voyage/i.test(s)) return 'adventure'
  if (/family drama|coming of age|loss and|marriage|betrayal/i.test(s)) return 'drama'
  return 'fantasy'
}

export function recommendStoryTypeFromIdea(idea: string): string {
  const s = idea.toLowerCase()
  if (/urban|creepypasta|subway|internet legend|viral story/i.test(s)) return 'urban legend'
  if (/ghost|haunted|poltergeist|possession|medium\b/i.test(s)) return 'paranormal'
  if (/folk tale|village elder|oral tradition|passed down/i.test(s)) return 'folklore'
  return 'myth'
}

export function recommendLengthFromIdea(idea: string): string {
  const s = idea.toLowerCase()
  if (/epic|saga|generations|many episodes|sprawling/i.test(s)) return 'long'
  if (/flash fiction|one minute|snippet|tiny tale|micro/i.test(s)) return 'short'
  return 'medium'
}

export function recommendStyleFromIdea(idea: string): VisualStyleId {
  const s = idea.toLowerCase()
  if (/love|romance|heart|wedding|kiss|cozy|storybook|gentle|folktale/i.test(s)) return 'cozy_storybook'
  if (/horror|dark|blood|nightmare|shadow/i.test(s)) return 'dark_anime'
  if (/fight|battle|war|ninja|mech|speed/i.test(s)) return 'cinematic_anime'
  if (/comic|funny|gag|slice/i.test(s)) return 'comic_panel'
  if (/magic|fairy|realm|dragon|soft/i.test(s)) return 'soft_anime_fantasy'
  return 'cinematic_anime'
}
