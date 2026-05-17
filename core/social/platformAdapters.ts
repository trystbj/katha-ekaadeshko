import type { PlatformPublishPayload, SocialPlatformId } from './socialPublishTypes'

export interface SocialPlatformAdapter {
  id: SocialPlatformId
  label: string
  composerUrl: string
  maxTitleChars: number
  maxCaptionChars: number
  /** Safe zone note for 9:16 subtitles */
  subtitleSafeZone: string
  buildSharePayload(payload: PlatformPublishPayload): Record<string, string>
}

const ADAPTERS: Record<SocialPlatformId, SocialPlatformAdapter> = {
  youtube_shorts: {
    id: 'youtube_shorts',
    label: 'YouTube Shorts',
    composerUrl: 'https://studio.youtube.com',
    maxTitleChars: 100,
    maxCaptionChars: 5000,
    subtitleSafeZone: 'Keep titles and burned captions above bottom 12% UI overlay.',
    buildSharePayload: (p) => ({
      title: p.caption.title.slice(0, 100),
      description: `${p.caption.hookLine}\n\n${p.caption.description}`,
      tags: p.caption.hashtags.replace(/#/g, '').split(/\s+/).filter(Boolean).join(',')
    })
  },
  tiktok: {
    id: 'tiktok',
    label: 'TikTok',
    composerUrl: 'https://www.tiktok.com/upload',
    maxTitleChars: 220,
    maxCaptionChars: 2200,
    subtitleSafeZone: 'Center-weight subtitles; avoid bottom 18% for UI chrome.',
    buildSharePayload: (p) => ({
      caption: `${p.caption.hookLine}\n\n${p.caption.description}\n\n${p.caption.hashtags}`
    })
  },
  instagram_reel: {
    id: 'instagram_reel',
    label: 'Instagram Reels',
    composerUrl: 'https://www.instagram.com/create/select/',
    maxTitleChars: 80,
    maxCaptionChars: 2200,
    subtitleSafeZone: 'Reels safe area: top 14% and bottom 20% for profile UI.',
    buildSharePayload: (p) => ({
      caption: `${p.caption.hookLine}\n\n${p.caption.description}\n\n${p.caption.hashtags}`
    })
  },
  facebook: {
    id: 'facebook',
    label: 'Facebook Reels',
    composerUrl: 'https://www.facebook.com/reel/create/',
    maxTitleChars: 80,
    maxCaptionChars: 2200,
    subtitleSafeZone: 'Facebook Reels: keep hook text clear of bottom engagement bar.',
    buildSharePayload: (p) => ({
      title: p.caption.title.slice(0, 80),
      description: `${p.caption.hookLine}\n\n${p.caption.description}`
    })
  }
}

export function getPlatformAdapter(id: SocialPlatformId): SocialPlatformAdapter {
  return ADAPTERS[id]
}

export function listPlatformAdapters(): SocialPlatformAdapter[] {
  return Object.values(ADAPTERS)
}
