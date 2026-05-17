import type { SocialCaptionBundle } from './socialPublishTypes'
import type { SocialPlatformId } from './socialPublishTypes'

function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

const HOOK_TEMPLATES = [
  'Wait for the twist…',
  'This story hits different.',
  'You won’t believe scene {n}…',
  'Pure cinematic emotion.',
  'The ending changed everything.'
]

/**
 * Rule-based viral caption bundle — AI polish can layer on top via API.
 */
export function generateSocialCaptions(input: {
  storyTitle: string
  genre: string
  theme: string
  sceneTexts: string[]
  platform: SocialPlatformId
  language?: string
}): SocialCaptionBundle {
  const lead = input.sceneTexts.find((s) => s.trim().length > 8) || input.storyTitle
  const hookTpl = HOOK_TEMPLATES[Math.abs(input.storyTitle.length) % HOOK_TEMPLATES.length]
  const hookLine = truncate(
    lead.includes('—') ? lead.split('—')[0].trim() : hookTpl.replace('{n}', String(Math.min(3, input.sceneTexts.length))),
    96
  )

  const suspense =
    input.genre.toLowerCase().includes('horror') || input.genre.toLowerCase().includes('mystery')
      ? 'Something is watching. 👀'
      : input.genre.toLowerCase().includes('romance')
        ? 'Feel every beat. 💫'
        : 'AI-directed cinematic story.'

  const description = truncate(
    `${hookLine}\n\n${lead.slice(0, 280)}\n\n${input.theme ? `${input.theme} · ` : ''}${input.genre}`,
    input.platform === 'tiktok' ? 2000 : 2200
  )

  const tags = [
    '#storytime',
    '#cinematic',
    '#shorts',
    input.genre ? `#${input.genre.replace(/\s+/g, '').toLowerCase().slice(0, 24)}` : '',
    '#fyp',
    '#katha'
  ]
    .filter(Boolean)
    .join(' ')

  return {
    title: truncate(input.storyTitle || 'Katha story', 100),
    hookLine,
    description,
    hashtags: tags,
    teaserLine: truncate(lead, 120),
    engagementHook: suspense
  }
}
