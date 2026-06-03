import type { VideoStudioState } from './videoStudio'
import type { StoryboardWorkflowPhase } from '../utils/storyboardWorkflow'

export type ProjectStatus = 'new' | 'in_progress' | 'completed'

export type VisualStyleId =
  | 'soft_anime_fantasy'
  | 'cozy_storybook'
  | 'cinematic_anime'
  | 'comic_panel'
  | 'cinematic_realistic'
  | 'custom'

/** Studio may have no style chosen until the user picks one. */
export type StyleSelection = '' | VisualStyleId

export type AspectMode = 'vertical_9_16' | 'horizontal_16_9'

export type AspectSelection = '' | AspectMode

export type NarratorGender = 'female' | 'male'

export type EpisodePacing = 'Action' | 'Emotional' | 'Normal' | 'Climax'

export type ProductionStage =
  | 'writing'
  | 'script_review'
  | 'visual_generation'
  | 'narration_motion'
  | 'video_assembly'
  | 'export_complete'

export type SceneProductionStatus =
  | 'script_ready'
  | 'awaiting_review'
  | 'scene_approved'
  | 'queued'
  | 'skipped'
  | 'generating_visuals'
  | 'visual_ready'
  | 'narration_ready'
  | 'video_ready'

export type SceneLineType = 'Dialogue' | 'Thought'

/** Structured screenplay line from pipeline `dialogue[]`. */
export interface StoryDialogueLine {
  character: string
  line: string
}

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

export type NamingPolicyMode = 'names' | 'pronoun_only' | 'anonymous'

/** UI toggles for cross-scene character consistency (studio). */
export interface CharacterConsistencyLocks {
  lockFace: boolean
  lockHair: boolean
  lockClothing: boolean
  lockAge: boolean
  lockVoice: boolean
  lockPersonality: boolean
}

export const DEFAULT_CHARACTER_CONSISTENCY_LOCKS: CharacterConsistencyLocks = {
  lockFace: true,
  lockHair: true,
  lockClothing: true,
  lockAge: true,
  lockVoice: false,
  lockPersonality: true
}

/** Locked cast identity for Leonardo + playback (per project). */
export interface CharacterIdentitySlot {
  slot: number
  label: string
  gender: 'male' | 'female' | 'neutral' | 'unknown'
  role: string
  visualIdentity: string
  baseImagePrompt: string
  hair?: string
  clothing?: string
}

export interface StoryCharacter {
  id: string
  name: string
  personality: string
  visualIdentity: string
  baseImagePrompt: string
  leonardoSeed?: number
  baseImageUrl?: string
  /** Optional cast metadata for prompts and Character Manager. */
  gender?: string
  age?: string
  role?: string
  appearance?: string
  /** Per-character reference stills (face / side / expression). */
  referenceImages?: CharacterReferenceImage[]
}

export interface StoryScene {
  index: number
  lineType: SceneLineType
  character: string
  /** Full playback body (narration + woven dialogue) for TTS/subtitles. */
  text: string
  /** Pure voiceover when dialogue is split for script display. */
  narrationText?: string
  /** Character lines when the pipeline returns structured dialogue. */
  dialogueLines?: StoryDialogueLine[]
  emoji?: string
  /** Shot / staging line from the pipeline script (paired with Leonardo stills). */
  visualDescription?: string
  /** Pipeline asset status for monitor / storyboard. */
  generationStatus?: 'writing' | 'image' | 'narration' | 'motion' | 'complete' | 'image_failed'
  /** Screenplay review card fields (stage 1). */
  sceneTitle?: string
  emotionalTone?: string
  cameraDirection?: string
  environment?: string
  characterActions?: string
  productionStatus?: SceneProductionStatus
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
  /** First scene narration MP3 from pipeline TTS (`/public/audio/...` or absolute URL). */
  narrationAudioUrl?: string
  /** Segmented music/SFX mix recipe from backend pipeline (`storyAudioPlan` render payload). */
  storyAudioPlan?: Record<string, unknown>
  /** AI cinematic director per-scene plan (expression, ambience, environment, mix). */
  cinematicDirectorPlan?: Record<string, unknown>
  /** Worker timing assembly from pipeline orchestration. */
  renderAssemblyPlan?: Record<string, unknown>
  /** Episodic memory snapshot for continuity (v3 cinematic orchestrator). */
  storyMemorySnapshot?: Record<string, unknown>
  /** Pre-render quality report from premium studio layer. */
  qualityReport?: Record<string, unknown>
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
  /** Leonardo still id for image-to-video continuity. */
  leonardoImageId?: string
  leonardoGenerationId?: string
  /** Per-scene motion clip from Leonardo video pass. */
  motionUrl?: string
  createdAt: string
}

/** Cross-scene Leonardo identity lock from visual pipeline. */
export interface CharacterVisualLock {
  characterId: string
  label: string
  gender?: string
  basePortrait?: string
  faceReference?: string
  outfitReference?: string
  styleReference?: string
  visualIdentity?: string
  baseImagePrompt?: string
  emotionVariants?: string[]
  poseVariants?: string[]
}

/** Internal scene production snapshot (pipeline stages). */
export interface SceneProductionState {
  story: string
  dialogue: StoryDialogueLine[]
  characters: string[]
  environment: string
  emotion: string
  camera: string
  lighting: string
  imageStatus: string
  videoStatus: string
  reviewed: boolean
  continuityId: string
}

export interface ProductionDirectives {
  genre: string
  emotion: string
  pacing: string
  visualStyle: string
  cameraStyle: string
  dialogueStyle: string
  animationStyle: string
  targetPlatform: string
  narrationTone: string
  lightingStyle: string
  motionIntensity: string
  sceneMood: string
  generationMode?: 'fast' | 'cinematic'
  directorNotes?: string
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
  /** Long-term studio memory (subtitle, export, cast, tone). */
  projectMemory?: Record<string, unknown>
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
  /** Active Supabase `render_jobs` row — resume polling after refresh until MP4 URL is stored. */
  renderJobId?: string
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
  /** User seed naming lock (pronoun-only vs proper names). */
  namingPolicyMode?: NamingPolicyMode
  /** Persistent cast locks passed to image generation and UI. */
  characterIdentityMemory?: CharacterIdentitySlot[]
  /** Per-project consistency lock toggles (Character Studio). */
  characterConsistencyLocks?: CharacterConsistencyLocks
  /** Storyboard-first workflow phase. */
  workflowPhase?: StoryboardWorkflowPhase
  /** True after pipeline story/script/images land (before manual final render). */
  storyboardReady?: boolean
  storyboardReadyAt?: string
  /** True when one or more episode scenes lack Leonardo stills. */
  storyboardPartial?: boolean
  /** Scene indices still missing images after last generation pass. */
  missingSceneImageIndices?: number[]
  /** Two-step pipeline: writing → script review → visuals → motion → video. */
  productionStage?: ProductionStage
  /** Step 1 complete — user may review script before visuals. */
  scriptReviewReady?: boolean
  scriptReviewReadyAt?: string
  /** User clicked Next / Generate assets — parallel scene images may run. */
  assetsGenerationApproved?: boolean
  assetsGenerationApprovedAt?: string
  /** Leonardo cross-scene character identity locks from visual pipeline. */
  characterVisualLocks?: CharacterVisualLock[]
  /** Structured AI production directives from intent analyzer. */
  productionDirectives?: ProductionDirectives
  /** Per-scene pipeline state for regeneration and review gates. */
  sceneProductionStates?: SceneProductionState[]
  /** Unified character/story/visual/animation memory snapshot. */
  productionMemory?: Record<string, unknown>
  /** Master story context for character locks and scene continuity. */
  masterStoryContext?: Record<string, unknown>
  /** Visible script language (always English in studio). */
  outputLanguage?: string
  /** Regional atmosphere from language picker (e.g. Nepali culture in English prose). */
  regionalContext?: string
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
      'soft anime illustration, warm colors, emotional anime expressions, gentle lighting, detailed anime backgrounds, cinematic anime composition, clean anime character design, cozy fantasy atmosphere, high-quality anime storytelling visuals, consistent character design'
  },
  cozy_storybook: {
    labelKey: 'style.cozyStorybook',
    previewGradient:
      'linear-gradient(180deg, rgba(255,220,140,0.18) 0%, rgba(80,120,90,0.35) 50%, rgba(12,20,16,0.82) 100%)',
    previewImageUrl: '/style-previews/cartoon.png',
    promptSuffix:
      'hand-drawn storybook illustration, cozy environments, whimsical atmosphere, storybook character design, warm lighting, charming details, children\'s book quality artwork, peaceful nature elements, soft illustrated textures, consistent character likeness'
  },
  cinematic_anime: {
    labelKey: 'style.cinematicAnime',
    previewGradient: 'linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.82))',
    previewImageUrl: '/style-previews/cinematic.png',
    promptSuffix:
      'cinematic concept art, movie-like composition, dramatic lighting, realistic depth, wide environmental shots, cinematic framing, emotional storytelling visuals, high-detail environments, professional film-quality scene design, consistent character'
  },
  comic_panel: {
    labelKey: 'style.comicPanel',
    previewGradient: 'linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.68))',
    previewImageUrl: '/style-previews/comic.png',
    promptSuffix:
      'comic book illustration, graphic novel quality, bold outlines, expressive characters, comic-style rendering, visual storytelling panels, dynamic poses, stylized environments, professional comic artwork, consistent character likeness'
  },
  cinematic_realistic: {
    labelKey: 'styleRealistic',
    previewGradient:
      'linear-gradient(180deg, transparent 0%, transparent 72%, rgba(0, 0, 0, 0.32) 100%)',
    previewImageUrl: '/style-previews/cinematic-realistic.png?v=1',
    promptSuffix:
      'realistic characters, realistic environments, natural lighting, realistic materials, photographic quality, believable anatomy, real-world textures, realistic cinematic composition, high-resolution visual storytelling, preserve character identity across scenes, consistent hairstyle clothing and facial features'
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
    renderJobId: partial?.renderJobId,
    videoStudio: partial?.videoStudio,
    narration: partial?.narration,
    uiLanguage: partial?.uiLanguage,
    translateContentToUiLanguage: partial?.translateContentToUiLanguage,
    characterReference: partial?.characterReference,
    namingPolicyMode: partial?.namingPolicyMode,
    characterIdentityMemory: partial?.characterIdentityMemory,
    characterConsistencyLocks:
      partial?.characterConsistencyLocks ?? DEFAULT_CHARACTER_CONSISTENCY_LOCKS,
    workflowPhase: partial?.workflowPhase,
    storyboardReady: partial?.storyboardReady,
    storyboardReadyAt: partial?.storyboardReadyAt
  }
}
