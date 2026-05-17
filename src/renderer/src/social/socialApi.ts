import type { ShortsOptimizationReport, SocialCaptionBundle, SocialPlatformId } from '../../../../core/social/socialPublishTypes'
import type { StoryEpisode } from '../types/story'

export async function fetchShortsOptimization(
  episode: StoryEpisode,
  totalDurationSec?: number
): Promise<ShortsOptimizationReport> {
  const res = await fetch('/api/social-shorts-optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ episode, totalDurationSec })
  })
  if (!res.ok) throw new Error(await res.text())
  const j = (await res.json()) as { report: ShortsOptimizationReport }
  return j.report
}

export async function fetchSocialCaptions(body: {
  storyTitle: string
  genre: string
  theme: string
  sceneTexts: string[]
  platform: SocialPlatformId
  language?: string
}): Promise<SocialCaptionBundle> {
  const res = await fetch('/api/social-caption', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error(await res.text())
  const j = (await res.json()) as { captions: SocialCaptionBundle }
  return j.captions
}
