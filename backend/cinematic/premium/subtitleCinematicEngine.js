/**
 * Advanced subtitle cinematics — emphasis, motion, speaker color metadata.
 */

const SPEAKER_COLORS = {
  narration: '#f5f0e8',
  default: '#ffe8b0',
  female: '#ffd4e8',
  male: '#b8d4ff',
  child: '#c8ffb8'
}

/**
 * @param {Array<object>} enrichedScenes
 * @param {Array<{ narration?: string; dialogue?: Array<{ character?: string; line?: string }> }>} script
 * @param {Array<object>} emotionProfiles
 */
export function buildSubtitleCinematicPlan(enrichedScenes, script, emotionProfiles) {
  return enrichedScenes.map((sc, i) => {
    const row = script[i] || {}
    const ep = emotionProfiles[i] || {}
    const emphasis = sc.subtitle?.emphasis || 'normal'
    const lines = Array.isArray(row.dialogue) ? row.dialogue : []
    const speakers = lines.map((d) => String(d.character || 'Character').trim())

    const motion =
      emphasis === 'high'
        ? 'punch_in'
        : emphasis === 'whisper'
          ? 'breathing_fade'
          : emphasis === 'soft'
            ? 'gentle_glow'
            : ep.romance > 0.55
              ? 'warm_pulse'
              : 'fade_slide'

    return {
      sceneIndex: sc.sceneIndex ?? i + 1,
      motion,
      emphasisWords: extractEmphasisWords(row.narration),
      speakerColors: {
        narration: SPEAKER_COLORS.narration,
        ...Object.fromEntries(speakers.map((s) => [s, SPEAKER_COLORS.default]))
      },
      glowIntensity: emphasis === 'high' ? 0.55 : emphasis === 'soft' ? 0.35 : 0.2,
      revealPacing: sc.subtitle?.revealPacing || 'natural',
      breathingAnimation: emphasis === 'whisper' || ep.primary === 'sadness',
      leadInMs: sc.subtitle?.leadInMs ?? 80,
      durationBias: sc.durationMs ? sc.durationMs * 0.92 : undefined
    }
  })
}

function extractEmphasisWords(text) {
  const raw = String(text || '')
  const words = raw.match(/\b(never|always|love|hate|death|promise|truth|forever|stop|run)\b/gi)
  return [...new Set((words || []).map((w) => w.toLowerCase()))].slice(0, 6)
}
