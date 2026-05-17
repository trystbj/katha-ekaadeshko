/**
 * Social caption bundle generator (backend).
 */

function truncate(text, max) {
  const t = String(text || '').replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

/**
 * @param {object} body
 */
export function buildSocialCaptions(body) {
  const storyTitle = body?.storyTitle || ''
  const genre = body?.genre || ''
  const theme = body?.theme || ''
  const sceneTexts = body?.sceneTexts || []
  const platform = body?.platform || 'tiktok'

  const lead = sceneTexts.find((s) => String(s).trim().length > 8) || storyTitle
  const hookLine = truncate(lead.includes('—') ? lead.split('—')[0].trim() : lead, 96)

  const suspense =
    genre.toLowerCase().includes('horror') || genre.toLowerCase().includes('mystery')
      ? 'Something is watching.'
      : genre.toLowerCase().includes('romance')
        ? 'Feel every beat.'
        : 'AI-directed cinematic story.'

  const description = truncate(
    `${hookLine}\n\n${String(lead).slice(0, 280)}\n\n${theme ? `${theme} · ` : ''}${genre}`,
    platform === 'tiktok' ? 2000 : 2200
  )

  const hashtags = ['#storytime', '#cinematic', '#shorts', '#fyp', '#katha']
    .concat(genre ? [`#${genre.replace(/\s+/g, '').toLowerCase().slice(0, 24)}`] : [])
    .join(' ')

  return {
    title: truncate(storyTitle || 'Katha story', 100),
    hookLine,
    description,
    hashtags,
    teaserLine: truncate(lead, 120),
    engagementHook: suspense
  }
}
