import type { VideoStudioState } from './videoStudio'

export type ProjectStatus = 'new' | 'in_progress' | 'completed'

export type VisualStyleId =
  | 'soft_anime_fantasy'
  | 'cozy_storybook'
  | 'cinematic_anime'
  | 'comic_panel'
  | 'dark_anime'
  | 'custom'

/** Studio may have no style chosen until the user picks one. */
export type StyleSelection = '' | VisualStyleId

export type AspectMode = 'vertical_9_16' | 'horizontal_16_9'

export type AspectSelection = '' | AspectMode

export type NarratorGender = 'female' | 'male'

export type EpisodePacing = 'Action' | 'Emotional' | 'Normal' | 'Climax'

export type SceneLineType = 'Dialogue' | 'Thought'

/** Primary story / narration tongue — aligned with story-region `languageCode` (`constants/storyLocaleOptions`). */
export type NarrationLanguageId =
  | 'ne'
  | 'hi'
  | 'en'
  | 'ja'
  | 'ko'
  | 'zh'
  | 'zh-CN'
  | 'es'
  | 'fr'
  | 'de'
  | 'ar'
  | 'ru'
  | 'th'
  | 'bn'
  | 'nl'
  | 'ms'
  | 'pt'
  | 'cs'
  | 'el'
  | 'id'
  | 'fa'
  | 'he'
  | 'it'
  | 'pl'
  | 'sv'
  | 'tr'
  | 'uk'
  | 'ur'
  | 'vi'

/** Narration prosody is adaptive-only (no manual sliders). */
export type NarrationVoiceMode = 'auto'

/** Optional narrator gender override; `auto` lets AI voice director decide. */
export type NarratorGenderPreference =
  | 'auto'
  | 'male'
  | 'female'
  | 'child'
  | 'elder'
  | 'mythical'
  | 'dark_entity'
  | 'anime_hero'
  | 'anime_villain'

export interface NarrationSettings {
  languageId: NarrationLanguageId
  voiceMode: NarrationVoiceMode
  /** AI Narrator Director — auto emotion, pacing, gender/language adaptation (default on). */
  autoVoiceDirector: boolean
  /** Optional gender preference when not using auto-detect. */
  narratorGenderPreference?: NarratorGenderPreference
  ai: {
    autoTranslateToNarrationLanguage: boolean
    preserveOriginalProperNames: boolean
    generateSubtitlesAutomatically: boolean
    dualSubtitleMode: boolean
    lipSyncDialogueWithSelectedLanguage: boolean
    multiNarratorMode: boolean
    episodeNarratorConsistencyLock: boolean
  }
}

export interface StoryCharacter {
  id: string
  name: string
  personality: string
  visualIdentity: string
  baseImagePrompt: string
  leonardoSeed?: number
  baseImageUrl?: string
}

export interface StoryScene {
  index: number
  lineType: SceneLineType
  character: string
  text: string
  emoji?: string
  /** Shot / staging line from the pipeline script (paired with Leonardo stills). */
  visualDescription?: string
}

export interface StoryEpisode {
  number: number
  pacing: EpisodePacing
  estimatedDurationSec: number
  scenes: StoryScene[]
  cliffhanger: string
  rawStructured?: string
  status: 'draft' | 'done' | 'current'
  /** User completed export / playback handoff for this episode (unlocks next chapter in sequence). */
  videoExportComplete?: boolean
  /** Auto-picked ambient bed URL when using Generate Story pipeline (pass as `backgroundMusic` to `/api/render`). */
  ambientBedUrl?: string
  /** Segmented music/SFX mix recipe from backend pipeline (`storyAudioPlan` render payload). */
  storyAudioPlan?: Record<string, unknown>
  /** AI cinematic director per-scene plan (expression, ambience, environment, mix). */
  cinematicDirectorPlan?: Record<string, unknown>
  /** Episodic memory snapshot for continuity (v3 cinematic orchestrator). */
  storyMemorySnapshot?: Record<string, unknown>
}

export interface StoryBible {
  title: string
  concept: string
  characters: StoryCharacter[]
  totalEpisodes: number
  outline: { episode: number; beat: string }[]
  userIdea: string
  styleId: VisualStyleId
  /** When `styleId` is `custom`, the visual prompt line used for generation. */
  customVisualPrompt?: string
  language: string
  aspectMode: AspectMode
  /** OpenAI TTS narrator preset id (see narratorPresets backend). */
  narratorId?: string
  /** Extended narrator / language / subtitle intent; renderer may map to engine-specific params. */
  narration?: NarrationSettings
}

export interface ContinuityNote {
  id: string
  text: string
  createdAt: string
}

export interface AssetRef {
  id: string
  kind: 'character' | 'background' | 'scene'
  key: string
  url?: string
  prompt: string
  seed?: number
  createdAt: string
}

export type CharacterReferenceStrength = 'light' | 'balanced' | 'strong'

export type CharacterReferenceRole = 'front' | 'side' | 'expression' | 'other'

export interface CharacterReferenceImage {
  id: string
  role: CharacterReferenceRole
  /** Resized data URL (webp/jpeg) stored per project for portability. */
  dataUrl: string
  filename?: string
  addedAt: string
}

export interface CharacterReferenceConfig {
  lockAllEpisodes: boolean
  strength: CharacterReferenceStrength
  autoTurnaroundPreview: boolean
  images: CharacterReferenceImage[]
}

export interface ProjectState {
  id: string
  title: string
  status: ProjectStatus
  createdAt: string
  updatedAt: string
  bible: StoryBible | null
  episodes: StoryEpisode[]
  /** Short rolling summary for prompts */
  memorySummary: string
  /** Persistent world simulation (v4 evolution engine). */
  worldStateSnapshot?: Record<string, unknown>
  /** Character relationship graph edges. */
  relationshipSnapshot?: Record<string, unknown>[]
  /** Learned creator cinematic preferences. */
  creatorPreferences?: Record<string, unknown>
  /** Hybrid creator studio — overrides, undo history, presets. */
  creatorStudio?: import('./creatorStudio').CreatorStudioProjectState
  /** Live production workflow preferences (mode, collaboration stub). */
  productionPipeline?: import('../../../../core/realtime/productionTypes').ProductionPipelineProjectState
  /** Normalized fingerprints to reduce repetition */
  contentFingerprints: string[]
  continuityNotes: ContinuityNote[]
  assets: AssetRef[]
  fontMode: 'clean' | 'story' | 'comic'
  qualityMerge: boolean
  /** Last completed worker render (Supabase public URL); used for in-app playback after refresh. */
  lastRenderVideoUrl?: string
  /** Post-export cinematic editor / publish drafts (optional). */
  videoStudio?: VideoStudioState | null
  /** Narrator language/voice selection per project (independent across parallel slots). */
  narration?: NarrationSettings
  /** UI language to restore when this project is loaded (full-app localization). */
  uiLanguage?: string
  /** Content translation preference: translate story/script into app language (UI always localized). */
  translateContentToUiLanguage?: boolean
  /** Optional per-project character reference images for consistency across generations. */
  characterReference?: CharacterReferenceConfig
}

export const STYLE_PRESETS: Record<
  VisualStyleId,
  { labelKey: string; previewGradient: string; promptSuffix: string; previewImageUrl: string }
> = {
  soft_anime_fantasy: {
    labelKey: 'style.softAnimeFantasy',
    previewGradient:
      'linear-gradient(180deg, rgba(255,200,140,0.22) 0%, rgba(40,28,60,0.55) 45%, rgba(8,12,28,0.88) 100%)',
    previewImageUrl: '/style-previews/soft.png',
    promptSuffix:
      'painterly cinematic fantasy illustration, cozy emotional lighting, warm cinematic atmosphere, soft glowing environments, dreamlike Nepal-inspired scenery, slow emotional pacing, rich fantasy composition, emotional depth and ambience, consistent character design'
  },
  cozy_storybook: {
    labelKey: 'style.cozyStorybook',
    previewGradient:
      'linear-gradient(180deg, rgba(255,220,140,0.18) 0%, rgba(80,120,90,0.35) 50%, rgba(12,20,16,0.82) 100%)',
    previewImageUrl: '/style-previews/cartoon.png',
    promptSuffix:
      'cozy hand-drawn storybook animation, calm simple expressive motion, soft nature ambience, friendly visual storytelling, warm cozy transitions, simple emotional expressions, nature-focused movement, storybook vibe, peaceful pacing, consistent character likeness'
  },
  cinematic_anime: {
    labelKey: 'style.cinematicAnime',
    previewGradient: 'linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.82))',
    previewImageUrl: '/style-previews/cinematic.png',
    promptSuffix:
      'cinematic anime cinematography, emotional closeups, strong lighting contrast, dramatic camera framing, anime-inspired cinematic compositions, emotional action pacing, film grain, consistent character'
  },
  comic_panel: {
    labelKey: 'style.comicPanel',
    previewGradient: 'linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.68))',
    previewImageUrl: '/style-previews/comic.png',
    promptSuffix:
      'motion comic aesthetic, stylized panels and framing, dynamic transitions, comic-style dramatic posing, bold ink lines, strong visual storytelling, consistent character likeness'
  },
  dark_anime: {
    labelKey: 'style.darkAnime',
    previewGradient:
      'linear-gradient(180deg, rgba(88,40,120,0.15) 0%, rgba(12,8,28,0.55) 45%, rgba(0,0,0,0.88) 100%)',
    previewImageUrl: '/style-previews/dark.png',
    promptSuffix:
      'atmospheric dark fantasy anime, intense shadows and fog, emotional tension, cinematic darkness, dramatic environments, mystery and suspense mood, consistent character'
  },
  custom: {
    labelKey: 'styleCustomVisual',
    previewGradient: 'linear-gradient(160deg, rgba(30,40,80,0.55), rgba(10,8,24,0.92))',
    previewImageUrl: '/style-previews/custom.png?v=2',
    promptSuffix: ''
  }
}

/** Resolved visual line for prompts (custom uses `customVisualPrompt`). */
export function getStylePromptSuffix(styleId: VisualStyleId, customVisualPrompt?: string): string {
  if (styleId === 'custom') {
    const line = (customVisualPrompt ?? '').trim()
    return line.length > 0 ? line : 'consistent illustrated story visuals, cohesive palette, readable staging'
  }
  return STYLE_PRESETS[styleId].promptSuffix
}

export function newProjectId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function defaultProject(partial?: Partial<ProjectState>): ProjectState {
  const id = partial?.id ?? newProjectId()
  const now = new Date().toISOString()
  return {
    id,
    title: partial?.title ?? 'Untitled Story',
    status: partial?.status ?? 'new',
    createdAt: partial?.createdAt ?? now,
    updatedAt: partial?.updatedAt ?? now,
    bible: partial?.bible ?? null,
    episodes: partial?.episodes ?? [],
    memorySummary: partial?.memorySummary ?? '',
    contentFingerprints: partial?.contentFingerprints ?? [],
    continuityNotes: partial?.continuityNotes ?? [],
    assets: partial?.assets ?? [],
    fontMode: partial?.fontMode ?? 'story',
    // kept for backward compatibility; multi-pass is now automatic (not shown in UI)
    qualityMerge: partial?.qualityMerge ?? true,
    lastRenderVideoUrl: partial?.lastRenderVideoUrl,
    videoStudio: partial?.videoStudio,
    narration: partial?.narration,
    uiLanguage: partial?.uiLanguage,
    translateContentToUiLanguage: partial?.translateContentToUiLanguage,
    characterReference: partial?.characterReference
  }
}
