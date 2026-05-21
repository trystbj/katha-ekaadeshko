/**
 * Cinematic opening + ending sequences (metadata for player/worker).
 */

const BOOKEND_STYLES = {
  soft_anime_fantasy: 'anime_fantasy',
  cinematic_anime: 'anime_cinematic',
  dark_anime: 'dark_cinematic',
  cozy_storybook: 'storybook_warm',
  comic_panel: 'comic_punch',
  custom: 'cinematic_neutral',
  documentary: 'documentary_real'
}

function resolveBookendStyle(input = {}) {
  const sid = String(input?.styleId || 'soft_anime_fantasy')
  const genre = String(input?.genre || '').toLowerCase()
  if (genre.includes('romance')) return 'romance_soft'
  if (genre.includes('horror')) return 'dark_cinematic'
  if (genre.includes('documentary')) return 'documentary_real'
  return BOOKEND_STYLES[sid] || 'cinematic_neutral'
}

/**
 * @param {object} params
 */
export function buildCinematicBookends(params) {
  const { story, input, storyArc, emotionProfiles = [] } = params
  const title = String(story?.title || 'Untitled').trim()
  const style = resolveBookendStyle(input)
  const avgRomance =
    emotionProfiles.reduce((a, e) => a + (e?.romance ?? 0), 0) / Math.max(1, emotionProfiles.length)
  const climax = storyArc?.climaxIndex ?? 1

  const opening = {
    kind: 'opening',
    style,
    durationMs: style.includes('documentary') ? 2200 : 2800,
    titleReveal: title.slice(0, 64),
    logoFadeMs: 600,
    soundtrackFadeInMs: 900,
    transitionIn: 'cinematic_fade_up',
    textMotion: style.includes('anime') ? 'animated_reveal' : 'soft_fade',
    episodeCard: {
      show: true,
      episodeNumber: 1,
      seriesLine: String(input?.theme || '').slice(0, 48)
    }
  }

  const ending = {
    kind: 'ending',
    style,
    durationMs: avgRomance > 0.55 ? 3600 : 3000,
    creditsRoll: true,
    emotionalFadeOutMs: 1400,
    transitionOut: 'cinematic_fade_black',
    closingLine: climax > 0 ? 'To be continued…' : '',
    soundtrackFadeOutMs: 1200
  }

  return { opening, ending, style }
}
