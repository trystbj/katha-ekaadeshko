/**
 * AI Director Personality — style-adaptive cinematic directing profiles.
 */

const PROFILES = {
  hollywood_cinematic: {
    id: 'hollywood_cinematic',
    label: 'Hollywood Cinematic',
    cameraMul: 1.1,
    pacingMul: 0.95,
    actingMul: 0.9,
    musicIntensityMul: 1.05,
    transitionStyle: 'smooth',
    atmosphereMul: 1,
    compositionBias: 'dramatic'
  },
  anime_director: {
    id: 'anime_director',
    label: 'Anime Director',
    cameraMul: 1.15,
    pacingMul: 1.05,
    actingMul: 1.2,
    musicIntensityMul: 1.1,
    transitionStyle: 'sharp',
    atmosphereMul: 1.05,
    compositionBias: 'dramatic'
  },
  cozy_storybook: {
    id: 'cozy_storybook',
    label: 'Cozy Storybook',
    cameraMul: 0.85,
    pacingMul: 0.8,
    actingMul: 0.75,
    musicIntensityMul: 0.75,
    transitionStyle: 'smooth',
    atmosphereMul: 0.9,
    compositionBias: 'wide'
  },
  dark_psychological: {
    id: 'dark_psychological',
    label: 'Dark Psychological',
    cameraMul: 1,
    pacingMul: 0.9,
    actingMul: 1,
    musicIntensityMul: 1.15,
    transitionStyle: 'gritty',
    atmosphereMul: 1.25,
    compositionBias: 'intimate'
  },
  mystery_thriller: {
    id: 'mystery_thriller',
    label: 'Mystery Thriller',
    cameraMul: 1.05,
    pacingMul: 1.1,
    actingMul: 0.95,
    musicIntensityMul: 1.08,
    transitionStyle: 'sharp',
    atmosphereMul: 1.15,
    compositionBias: 'intimate'
  },
  fantasy_epic: {
    id: 'fantasy_epic',
    label: 'Fantasy Epic',
    cameraMul: 1.2,
    pacingMul: 1,
    actingMul: 1.05,
    musicIntensityMul: 1.12,
    transitionStyle: 'smooth',
    atmosphereMul: 1.2,
    compositionBias: 'wide'
  },
  emotional_drama: {
    id: 'emotional_drama',
    label: 'Emotional Drama',
    cameraMul: 0.95,
    pacingMul: 0.85,
    actingMul: 1.15,
    musicIntensityMul: 1,
    transitionStyle: 'smooth',
    atmosphereMul: 1,
    compositionBias: 'intimate'
  },
  experimental_art: {
    id: 'experimental_art',
    label: 'Experimental Arthouse',
    cameraMul: 1.1,
    pacingMul: 0.75,
    actingMul: 0.85,
    musicIntensityMul: 0.9,
    transitionStyle: 'dreamlike',
    atmosphereMul: 1.1,
    compositionBias: 'experimental'
  }
}

const STYLE_MAP = {
  cinematic_anime: 'anime_director',
  soft_anime_fantasy: 'fantasy_epic',
  cinematic_realistic: 'hollywood_cinematic',
  cozy_storybook: 'cozy_storybook',
  comic_panel: 'anime_director',
  custom: 'hollywood_cinematic'
}

const GENRE_MAP = {
  horror: 'dark_psychological',
  mystery: 'mystery_thriller',
  thriller: 'mystery_thriller',
  romance: 'emotional_drama',
  fantasy: 'fantasy_epic',
  drama: 'emotional_drama'
}

/**
 * @param {string} [styleId]
 * @param {string} [genre]
 * @param {string} [preference] DirectorPersonalityId | 'auto'
 */
export function resolveDirectorPersonality(styleId, genre, preference = 'auto') {
  const pref = String(preference || 'auto').trim()
  if (pref !== 'auto' && PROFILES[pref]) return { ...PROFILES[pref] }

  const sid = String(styleId || '').trim()
  if (STYLE_MAP[sid]) return { ...PROFILES[STYLE_MAP[sid]] }

  const g = String(genre || '').toLowerCase()
  for (const [key, id] of Object.entries(GENRE_MAP)) {
    if (g.includes(key) && PROFILES[id]) return { ...PROFILES[id] }
  }

  return { ...PROFILES.hollywood_cinematic }
}

/**
 * Apply personality multipliers to scene cues (non-destructive).
 * @param {object} scene
 * @param {object} profile
 */
export function applyDirectorPersonalityToScene(scene, profile) {
  if (!scene || !profile) return scene
  const cam = scene.camera
  if (cam) {
    cam.breathing = Math.min(1, (cam.breathing ?? 0.15) * profile.cameraMul)
    cam.shakeIntensity = Math.min(1, (cam.shakeIntensity ?? 0) * profile.cameraMul)
    cam.parallaxDepth = Math.min(1, (cam.parallaxDepth ?? 0.25) * profile.cameraMul)
  }
  if (scene.acting) {
    scene.acting.gestureIntensity = Math.min(
      1,
      (scene.acting.gestureIntensity ?? 0.4) * profile.actingMul
    )
  }
  if (scene.music) {
    scene.music.intensity = Math.min(1, (scene.music.intensity ?? 0.5) * profile.musicIntensityMul)
  }
  if (scene.environment) {
    scene.environment.fog = Math.min(1, (scene.environment.fog ?? 0) * profile.atmosphereMul)
    scene.environment.warmth = Math.min(
      1,
      Math.max(0, (scene.environment.warmth ?? 0.5) * (profile.transitionStyle === 'gritty' ? 0.85 : 1))
    )
  }
  if (scene.pacing) {
    scene.pacing.beatWeight = Math.min(1, (scene.pacing.beatWeight ?? 0.5) * profile.pacingMul)
    scene.pacing.pauseAfterMs = Math.round((scene.pacing.pauseAfterMs ?? 0) / profile.pacingMul)
  }
  return scene
}
