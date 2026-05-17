/** Post-render video workspace — persisted on `ProjectState.videoStudio`. */

import { defaultSubtitleStudioState, type SubtitleStudioState } from './subtitleStudio'

export type VideoPreviewQuality = 'source' | 'hd' | 'sd'

export type VideoMotionPreset =
  | 'static'
  | 'slow_zoom_in'
  | 'cinematic_push'
  | 'pull_out'
  | 'parallax_float'
  | 'tilt_dramatic'
  | 'orbit_soft'
  | 'handheld_micro'
  | 'smooth_pan'
  | 'shake_dramatic'
  | 'ai_auto_motion'

export type VideoFilterPreset =
  | 'none'
  | 'cinematic'
  | 'warm'
  | 'cold'
  | 'moody'
  | 'dreamy'
  | 'vintage'
  | 'anime_pop'
  | 'noir'
  | 'vibrant'
  | 'dramatic'
  | 'horror_dark'
  | 'folk_warm'
  | 'mystical_glow'
  | 'custom_stack'

export type PublishPlatformId = 'youtube_shorts' | 'tiktok' | 'instagram_reel' | 'facebook'

/** Upload / delivery packaging preference — always transcode from master render, never from a lossy intermediate when using local tooling. */
export type PublishExportQualityMode = 'maximum' | 'balanced' | 'small'

export type PublishJobStatus =
  | 'idle'
  | 'preparing'
  | 'optimizing'
  | 'uploading'
  | 'processing'
  | 'published'
  | 'failed'

/** Unified publish payload — smart presets + editable metadata + job status. */
export interface PublishDraft {
  activePlatform: PublishPlatformId
  /** Human-readable export hints when switching platform icon */
  exportPresetSummary: string
  /** Quality tier for any optional delivery transcode / upload guidance (default maximum). */
  exportQualityMode: PublishExportQualityMode
  title: string
  description: string
  hashtags: string
  hookLine: string
  seoKeywords: string
  thumbnailFrameSec: number
  youtubeTags: string
  youtubeCategory: string
  trendingSuggestions: string
  instagramBlocks: string
  facebookTitle: string
  facebookDescription: string
  privacy: 'public' | 'unlisted' | 'private' | 'followers'
  scheduledAt: string
  linkedYoutube: boolean
  linkedTiktok: boolean
  linkedInstagram: boolean
  linkedFacebook: boolean
  jobStatus: PublishJobStatus
  jobDetail: string
  metadataGeneratedAt: string | null
}

export interface TikTokPublishDraft {
  title: string
  caption: string
  hashtags: string
  privacy: 'public' | 'followers' | 'private'
  /** ISO string from datetime-local */
  scheduledAt: string
  /** Seconds into exported video for cover extraction */
  coverTimeSec: number
}

export interface VideoStudioDraft {
  trimStartSec: number
  trimEndSec: number
  splitAtSec: number | null
  playbackSpeed: number
  loopPlayback: boolean
  previewQuality: VideoPreviewQuality
  filterId: VideoFilterPreset
  motionGlobal: VideoMotionPreset
  motionBySceneIndex: Partial<Record<number, VideoMotionPreset>>
  /** Lightweight edit recipe flags — worker / future FFmpeg pass reads these. */
  recipe: {
    fadeInSec: number
    fadeOutSec: number
    dissolveBetweenScenes: boolean
    letterbox: boolean
    vignette: number
    grain: number
    sharpenPreview: number
    watermarkText: string
    cinematicTransitions: boolean
  }
  tiktok: TikTokPublishDraft
  /** One-click publish workflow — icons, metadata, previews, job simulation */
  publish: PublishDraft
  editorNotes: string
  autoEnhanceLastRun?: string
}

export interface VideoStudioSnapshot {
  savedAt: string
  label: string
  draft: VideoStudioDraft
}

export interface VideoStudioState {
  draft: VideoStudioDraft
  /** Newest first; capped when saving */
  history: VideoStudioSnapshot[]
  /** Post-render subtitle/caption studio — separate from preview-only CC chips */
  subtitleStudio: SubtitleStudioState
}

export function defaultPublishDraft(titleGuess: string): PublishDraft {
  return {
    activePlatform: 'tiktok',
    exportQualityMode: 'maximum',
    exportPresetSummary: composeExportPresetSummary('tiktok', 'maximum'),
    title: titleGuess.slice(0, 100),
    description: '',
    hashtags: '',
    hookLine: '',
    seoKeywords: '',
    thumbnailFrameSec: 0,
    youtubeTags: '',
    youtubeCategory: 'Entertainment',
    trendingSuggestions: '',
    instagramBlocks: '',
    facebookTitle: titleGuess.slice(0, 80),
    facebookDescription: '',
    privacy: 'public',
    scheduledAt: '',
    linkedYoutube: false,
    linkedTiktok: false,
    linkedInstagram: false,
    linkedFacebook: false,
    jobStatus: 'idle',
    jobDetail: '',
    metadataGeneratedAt: null
  }
}

export function presetSummaryForPlatform(id: PublishPlatformId): string {
  switch (id) {
    case 'youtube_shorts':
      return '9:16 vertical · Shorts bitrate ladder · SEO tags + category · thumbnail frame'
    case 'tiktok':
      return 'Vertical optimized · hook-first caption · hashtag clusters · trending cues'
    case 'instagram_reel':
      return 'Reel compression preset · caption blocks · hashtag groups · cover frame'
    case 'facebook':
      return 'Feed/Reel friendly · title + description · hashtag bundle'
    default:
      return ''
  }
}

export function composeExportPresetSummary(
  platform: PublishPlatformId,
  mode: PublishExportQualityMode = 'maximum'
): string {
  const tail =
    mode === 'maximum'
      ? 'Maximum export quality (recommended)'
      : mode === 'balanced'
        ? 'Balanced export quality'
        : 'Smaller file export'
  return `${presetSummaryForPlatform(platform)} · ${tail}`
}

/** Migrate older drafts missing `publish`. */
export function normalizeVideoStudioDraft(d: VideoStudioDraft, titleGuess: string): VideoStudioDraft {
  if (d.publish) {
    const mode = d.publish.exportQualityMode ?? 'maximum'
    const summary =
      d.publish.exportPresetSummary?.trim() ||
      composeExportPresetSummary(d.publish.activePlatform, mode)
    return {
      ...d,
      publish: {
        ...d.publish,
        exportQualityMode: mode,
        exportPresetSummary: summary
      }
    }
  }
  const pub = defaultPublishDraft(titleGuess)
  pub.title = (d.tiktok.title || titleGuess).slice(0, 100)
  pub.description = d.tiktok.caption || ''
  pub.hashtags = d.tiktok.hashtags || ''
  pub.thumbnailFrameSec = d.tiktok.coverTimeSec ?? 0
  pub.scheduledAt = d.tiktok.scheduledAt || ''
  pub.privacy =
    d.tiktok.privacy === 'followers'
      ? 'followers'
      : d.tiktok.privacy === 'private'
        ? 'private'
        : 'public'
  return { ...d, publish: pub }
}

export function defaultTikTokDraft(titleGuess: string): TikTokPublishDraft {
  return {
    title: titleGuess.slice(0, 120),
    caption: '',
    hashtags: '',
    privacy: 'public',
    scheduledAt: '',
    coverTimeSec: 0
  }
}

export function defaultVideoStudioDraft(titleGuess: string): VideoStudioDraft {
  return {
    trimStartSec: 0,
    trimEndSec: 0,
    splitAtSec: null,
    playbackSpeed: 1,
    loopPlayback: false,
    previewQuality: 'source',
    filterId: 'none',
    motionGlobal: 'static',
    motionBySceneIndex: {},
    recipe: {
      fadeInSec: 0,
      fadeOutSec: 0,
      dissolveBetweenScenes: false,
      letterbox: false,
      vignette: 0,
      grain: 0,
      sharpenPreview: 0,
      watermarkText: '',
      cinematicTransitions: false
    },
    tiktok: defaultTikTokDraft(titleGuess),
    publish: defaultPublishDraft(titleGuess),
    editorNotes: ''
  }
}

export function defaultVideoStudioState(titleGuess: string): VideoStudioState {
  const draft = defaultVideoStudioDraft(titleGuess)
  return { draft, history: [], subtitleStudio: defaultSubtitleStudioState() }
}

/** CSS filters for preview-only grading (export parity requires worker FFmpeg). */
export function cssFilterForPreset(id: VideoFilterPreset): string {
  switch (id) {
    case 'cinematic':
      return 'contrast(1.08) saturate(1.05) brightness(0.97)'
    case 'warm':
      return 'sepia(0.12) saturate(1.15) hue-rotate(-8deg)'
    case 'cold':
      return 'saturate(0.92) hue-rotate(12deg) brightness(1.02)'
    case 'moody':
      return 'contrast(1.15) brightness(0.88) saturate(0.85)'
    case 'dreamy':
      return 'brightness(1.06) saturate(1.08) blur(0.3px)'
    case 'vintage':
      return 'sepia(0.35) contrast(1.05) brightness(0.95)'
    case 'anime_pop':
      return 'saturate(1.35) contrast(1.08)'
    case 'noir':
      return 'grayscale(1) contrast(1.2)'
    case 'vibrant':
      return 'saturate(1.45) contrast(1.06)'
    case 'dramatic':
      return 'contrast(1.22) brightness(0.92)'
    case 'horror_dark':
      return 'brightness(0.82) contrast(1.18) saturate(0.75)'
    case 'folk_warm':
      return 'sepia(0.08) saturate(1.12) contrast(1.04)'
    case 'mystical_glow':
      return 'brightness(1.05) saturate(1.18) hue-rotate(-18deg)'
    case 'custom_stack':
      return 'contrast(1.06) saturate(1.1)'
    default:
      return 'none'
  }
}
