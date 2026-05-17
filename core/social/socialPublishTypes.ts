/** Direct social publishing — provider-agnostic types. */

export type SocialPlatformId = 'youtube_shorts' | 'tiktok' | 'instagram_reel' | 'facebook'

export type SocialAccountStatus = 'disconnected' | 'linked' | 'expired'

export interface SocialAccountConnection {
  platform: SocialPlatformId
  status: SocialAccountStatus
  displayName?: string
  linkedAt?: string
  /** OAuth token slot — never log in production */
  tokenRef?: string
}

export type SocialPublishJobStatus =
  | 'queued'
  | 'preparing'
  | 'optimizing'
  | 'uploading'
  | 'processing'
  | 'published'
  | 'failed'

export interface SocialPublishJob {
  id: string
  platform: SocialPlatformId
  projectId: string
  videoUrl: string
  status: SocialPublishJobStatus
  progress: number
  stage: string
  detail: string
  queuedAt: string
  updatedAt: string
}

export interface ViralClipSuggestion {
  id: string
  label: string
  startSec: number
  endSec: number
  reason: string
  hookLine?: string
}

export interface ShortsOptimizationReport {
  version: 1
  hookStartSec: number
  thumbnailFrameSec: number
  pacingScore: number
  emotionalPeakSceneIndex: number
  clips: ViralClipSuggestion[]
  tips: string[]
}

export interface SocialCaptionBundle {
  title: string
  hookLine: string
  description: string
  hashtags: string
  teaserLine: string
  engagementHook: string
}

export interface PlatformPublishPayload {
  platform: SocialPlatformId
  videoUrl: string
  caption: SocialCaptionBundle
  privacy: string
  thumbnailFrameSec: number
  encodeHints: string[]
}
