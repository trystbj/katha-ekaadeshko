import type { PublishDraft } from '../types/videoStudio'
import { suggestHashtags } from './suggestStoryHashtags'
import { SECONDS_PER_RENDER_SCENE } from './scenesWebVtt'

function truncateWords(text: string, maxChars: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= maxChars) return t
  return `${t.slice(0, maxChars - 1).trim()}…`
}

function longestSceneStartSec(sceneTexts: string[]): number {
  let bestI = 0
  let bestLen = 0
  for (let i = 0; i < sceneTexts.length; i++) {
    const L = sceneTexts[i]?.trim().length ?? 0
    if (L > bestLen) {
      bestLen = L
      bestI = i
    }
  }
  return bestI * SECONDS_PER_RENDER_SCENE
}

function genreTrending(genre: string): string {
  const g = genre.toLowerCase()
  if (g.includes('horror')) return '#horror #creepystory #spooky #thriller'
  if (g.includes('comedy')) return '#comedy #funny #relatable #humor'
  if (g.includes('romance')) return '#romance #love #feelgood #story'
  if (g.includes('mystery')) return '#mystery #detective #plotTwist #suspense'
  return '#storytime #fyp #shorts #fiction'
}

/**
 * Rule-based publish bundle — optional AI polish layered separately.

 */

export function generatePublishMetadata(input: {
  storyTitle: string
  concept: string
  genre: string
  theme: string
  language: string
  country: string
  userIdea: string
  sceneTexts: string[]
}): Pick<
  PublishDraft,
  | 'title'
  | 'description'
  | 'hashtags'
  | 'hookLine'
  | 'seoKeywords'
  | 'thumbnailFrameSec'
  | 'youtubeTags'
  | 'youtubeCategory'
  | 'trendingSuggestions'
  | 'instagramBlocks'
  | 'facebookTitle'
  | 'facebookDescription'
> {
  const sceneTexts = input.sceneTexts.map((s) => String(s || '').trim()).filter(Boolean)
  const leadScene = sceneTexts[0] || input.concept || input.userIdea || input.storyTitle
  const hookLine = truncateWords(
    leadScene.includes('—')
      ? leadScene.split('—')[0].trim()
      : truncateWords(leadScene, 92),
    96
  )
  const summaryBits = [
    input.concept,
    sceneTexts.slice(0, 3).join(' · '),
    `${input.theme} · ${input.genre}`
  ]
    .filter(Boolean)
    .join('\n')

  const description = truncateWords(
    `${hookLine}\n\n${truncateWords(summaryBits, 420)}\n\n${input.country ? `${input.country} · ` : ''}${input.language}`,
    2100
  )

  const hashtags = suggestHashtags(`${input.storyTitle} ${input.genre} ${input.theme}`, input.genre, 14)
  const seoKeywords = [
    input.storyTitle,
    input.genre,
    input.theme,
    input.language,
    input.country,
    'story video',
    'AI story',
    'short drama'
  ]
    .filter(Boolean)
    .join(', ')

  const ytTags = [
    input.genre,
    input.theme,
    'short story',
    'storytelling',
    input.language,
    'vertical video'
  ]
    .filter(Boolean)
    .join(', ')

  const igBlocks = `${hookLine}\n\n${truncateWords(summaryBits, 260)}\n\n${hashtags.split(' ').slice(0, 8).join(' ')}`

  const fbDesc = truncateWords(`${hookLine} ${summaryBits.replace(/\n+/g, ' ')}`, 520)

  return {
    title: truncateWords(input.storyTitle || input.userIdea || 'Untitled Katha', 100),
    description,
    hashtags,
    hookLine,
    seoKeywords,
    thumbnailFrameSec: longestSceneStartSec(sceneTexts.length ? sceneTexts : [input.concept]),
    youtubeTags: ytTags.slice(0, 420),
    youtubeCategory: 'Entertainment',
    trendingSuggestions: genreTrending(input.genre),
    instagramBlocks: igBlocks.slice(0, 2100),
    facebookTitle: truncateWords(input.storyTitle || input.userIdea || 'Story', 80),
    facebookDescription: fbDesc
  }
}
