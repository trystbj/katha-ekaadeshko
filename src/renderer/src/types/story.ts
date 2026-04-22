export type ProjectStatus = 'new' | 'in_progress' | 'completed'

export type VisualStyleId =
  | 'soft_anime_fantasy'
  | 'cinematic_anime'
  | 'comic_panel'
  | 'dark_anime'
  | 'romantic_glow'

export type AspectMode = 'vertical_9_16' | 'horizontal_16_9'

export type EpisodePacing = 'Action' | 'Emotional' | 'Normal' | 'Climax'

export type SceneLineType = 'Dialogue' | 'Thought'

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
}

export interface StoryEpisode {
  number: number
  pacing: EpisodePacing
  estimatedDurationSec: number
  scenes: StoryScene[]
  cliffhanger: string
  rawStructured?: string
  status: 'draft' | 'done' | 'current'
}

export interface StoryBible {
  title: string
  concept: string
  characters: StoryCharacter[]
  totalEpisodes: number
  outline: { episode: number; beat: string }[]
  userIdea: string
  styleId: VisualStyleId
  language: string
  aspectMode: AspectMode
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
  /** Normalized fingerprints to reduce repetition */
  contentFingerprints: string[]
  continuityNotes: ContinuityNote[]
  assets: AssetRef[]
  fontMode: 'clean' | 'story' | 'comic'
  qualityMerge: boolean
}

export const STYLE_PRESETS: Record<
  VisualStyleId,
  { labelKey: string; previewGradient: string; promptSuffix: string }
> = {
  soft_anime_fantasy: {
    labelKey: 'style.softAnimeFantasy',
    previewGradient: 'linear-gradient(135deg,#e8d5f2,#a8d8ea,#fce4ec)',
    promptSuffix:
      'soft anime fantasy illustration, gentle lighting, painterly, pastel palette, detailed eyes, consistent character design'
  },
  cinematic_anime: {
    labelKey: 'style.cinematicAnime',
    previewGradient: 'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)',
    promptSuffix:
      'cinematic anime, film grain, dramatic lighting, wide composition, high detail, consistent character'
  },
  comic_panel: {
    labelKey: 'style.comicPanel',
    previewGradient: 'linear-gradient(135deg,#fff3e0,#ffe0b2,#ffcc80)',
    promptSuffix:
      'comic panel style, bold ink lines, halftone accents, expressive poses, consistent character likeness'
  },
  dark_anime: {
    labelKey: 'style.darkAnime',
    previewGradient: 'linear-gradient(135deg,#0d0d0d,#1a1025,#2d1b4e)',
    promptSuffix:
      'dark anime aesthetic, moody shadows, limited palette, emotional intensity, consistent character'
  },
  romantic_glow: {
    labelKey: 'style.romanticGlow',
    previewGradient: 'linear-gradient(135deg,#ffecd2,#fcb69f,#ff8fab)',
    promptSuffix:
      'romantic glow anime, soft bloom, warm highlights, dreamy atmosphere, consistent character design'
  }
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
    qualityMerge: partial?.qualityMerge ?? true
  }
}
