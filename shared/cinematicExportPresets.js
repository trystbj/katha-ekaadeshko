/**
 * Cinematic export presets — pacing, subtitles, camera timing per platform/mode.
 */

/** @typedef {'tiktok_cinematic' | 'youtube_shorts_cinematic' | 'instagram_reels' | 'anime_cinematic' | 'storybook_cinematic' | 'documentary' | 'film_trailer'} CinematicExportPresetId */

/** @type {Record<string, { label: string; secondsPerScene: number; fps: number; subtitleLinePct: number; subtitleAlign: string; transitionBias: string; motionBias: string; pacingNote: string }>} */
export const CINEMATIC_EXPORT_PRESETS = {
  tiktok_cinematic: {
    label: 'TikTok cinematic',
    secondsPerScene: 3.2,
    fps: 30,
    subtitleLinePct: 82,
    subtitleAlign: 'center',
    transitionBias: 'punch_cut',
    motionBias: 'dynamic_zoom',
    pacingNote: 'Fast hooks, tight cuts, high subtitle contrast.'
  },
  youtube_shorts_cinematic: {
    label: 'YouTube Shorts',
    secondsPerScene: 3.8,
    fps: 30,
    subtitleLinePct: 78,
    subtitleAlign: 'center',
    transitionBias: 'flow',
    motionBias: 'cinematic_push',
    pacingNote: 'Balanced retention pacing with readable captions.'
  },
  instagram_reels: {
    label: 'Instagram Reels',
    secondsPerScene: 3.5,
    fps: 30,
    subtitleLinePct: 80,
    subtitleAlign: 'center',
    transitionBias: 'dissolve_soft',
    motionBias: 'parallax_float',
    pacingNote: 'Polished vertical framing, soft transitions.'
  },
  anime_cinematic: {
    label: 'Anime cinematic',
    secondsPerScene: 4.5,
    fps: 30,
    subtitleLinePct: 76,
    subtitleAlign: 'center',
    transitionBias: 'dramatic_hold',
    motionBias: 'slow_zoom_in',
    pacingNote: 'Emotional holds, dramatic pauses, expressive motion.'
  },
  storybook_cinematic: {
    label: 'Storybook cinematic',
    secondsPerScene: 5.2,
    fps: 24,
    subtitleLinePct: 72,
    subtitleAlign: 'center',
    transitionBias: 'gentle_fade',
    motionBias: 'smooth_pan',
    pacingNote: 'Calm pacing, cozy narration rhythm.'
  },
  documentary: {
    label: 'Documentary',
    secondsPerScene: 5.5,
    fps: 24,
    subtitleLinePct: 68,
    subtitleAlign: 'start',
    transitionBias: 'cut_clean',
    motionBias: 'static',
    pacingNote: 'Observational pacing, lower motion, informative subtitles.'
  },
  film_trailer: {
    label: 'Film trailer',
    secondsPerScene: 2.4,
    fps: 30,
    subtitleLinePct: 85,
    subtitleAlign: 'center',
    transitionBias: 'impact_cut',
    motionBias: 'shake_dramatic',
    pacingNote: 'Teaser montage — rapid cuts, peak emphasis.'
  }
}

/**
 * @param {string} [presetId]
 */
export function resolveCinematicExportPreset(presetId) {
  const id = String(presetId || 'youtube_shorts_cinematic').trim()
  return CINEMATIC_EXPORT_PRESETS[id] || CINEMATIC_EXPORT_PRESETS.youtube_shorts_cinematic
}
