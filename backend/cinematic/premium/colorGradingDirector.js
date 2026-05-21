/**
 * AI-directed cinematic color grading (LUT metadata for CSS/worker).
 */

const GRADE_PRESETS = {
  romance_warm: { lut: 'warm_romance', warmth: 0.78, contrast: 1.05, saturation: 1.08 },
  horror_cold: { lut: 'cold_horror', warmth: 0.22, contrast: 1.18, saturation: 0.82 },
  fantasy_dream: { lut: 'dream_fantasy', warmth: 0.62, contrast: 0.95, saturation: 1.12 },
  nostalgic_film: { lut: 'film_nostalgia', warmth: 0.68, contrast: 1.02, saturation: 0.92 },
  anime_cinematic: { lut: 'anime_cine', warmth: 0.55, contrast: 1.1, saturation: 1.15 },
  documentary_real: { lut: 'doc_neutral', warmth: 0.5, contrast: 1, saturation: 0.98 },
  dark_noir: { lut: 'noir_crush', warmth: 0.35, contrast: 1.22, saturation: 0.75 }
}

function pickGrade(emotionProfile, input) {
  const ep = emotionProfile || {}
  const genre = String(input?.genre || '').toLowerCase()
  if ((ep.romance ?? 0) > 0.55 || genre.includes('romance')) return GRADE_PRESETS.romance_warm
  if (ep.primary === 'fear' || (ep.suspense ?? 0) > 0.65 || genre.includes('horror'))
    return GRADE_PRESETS.horror_cold
  if (genre.includes('fantasy') || ep.primary === 'wonder') return GRADE_PRESETS.fantasy_dream
  if (genre.includes('documentary')) return GRADE_PRESETS.documentary_real
  if (String(input?.styleId) === 'dark_anime') return GRADE_PRESETS.dark_noir
  if (/anime/.test(String(input?.styleId || ''))) return GRADE_PRESETS.anime_cinematic
  if (ep.primary === 'sadness') return { ...GRADE_PRESETS.nostalgic_film, warmth: 0.42 }
  return GRADE_PRESETS.nostalgic_film
}

/**
 * @param {Array<object>} enrichedScenes
 * @param {Array<object>} emotionProfiles
 * @param {object} input
 */
export function applyColorGradingToScenes(enrichedScenes, emotionProfiles, input) {
  return enrichedScenes.map((sc, i) => {
    const grade = pickGrade(emotionProfiles[i], input)
    const prev = enrichedScenes[i - 1]
    const transitionGrade =
      prev && grade.lut !== pickGrade(emotionProfiles[i - 1], input).lut ? 'crossfade_grade' : 'hold'
    return {
      ...sc,
      colorGrade: {
        ...grade,
        transition: transitionGrade,
        vignette: (emotionProfiles[i]?.suspense ?? 0) > 0.5 ? 0.35 : 0.15
      }
    }
  })
}
