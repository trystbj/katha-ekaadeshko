/**
 * AI Co-pilot — natural language → synchronized scene patches (provider-agnostic).
 */

const RULES = [
  { re: /\b(sadder|more sad|grief|melancholy)\b/i, domain: 'emotion', delta: { sadness: 0.2 }, summary: 'Increase emotional sadness' },
  { re: /\b(happier|more joy|uplifting)\b/i, domain: 'emotion', delta: { warmth: 0.2 }, summary: 'Warm hopeful tone' },
  { re: /\b(more suspense|tenser|tension|scarier)\b/i, domain: 'emotion', delta: { suspense: 0.25, tension: 0.15 }, summary: 'Raise suspense' },
  { re: /\b(slow(er)? narration|slower voice|slow down)\b/i, domain: 'pacing', delta: { pacingMul: 0.85 }, summary: 'Slow narration pacing' },
  { re: /\b(faster|quicker|speed up)\b/i, domain: 'pacing', delta: { pacingMul: 1.15 }, summary: 'Faster pacing' },
  { re: /\b(darker ambience|darker atmosphere|more noir)\b/i, domain: 'ambience', delta: { ambienceMul: 1.2, fog: 0.15 }, summary: 'Darker ambience' },
  { re: /\b(softer music|quieter soundtrack|gentle music)\b/i, domain: 'music', delta: { musicIntensityMul: 0.75 }, summary: 'Softer soundtrack' },
  { re: /\b(more cinematic camera|camera movement|dynamic camera)\b/i, domain: 'camera', delta: { cameraIntensityMul: 1.25, parallax: 0.1 }, summary: 'More camera motion' },
  { re: /\b(anime|more anime)\b/i, domain: 'style', delta: { exaggeration: 0.2 }, summary: 'Anime-style emphasis' },
  { re: /\b(smooth(er)? transition)\b/i, domain: 'transitions', delta: { transitionSoftness: 1 }, summary: 'Smoother transitions' },
  { re: /\b(more intense|intensity|dramatic)\b/i, domain: 'intensity', delta: { intensityMul: 1.2 }, summary: 'Higher cinematic intensity' },
  { re: /\b(subtitle|captions).*(earlier|sooner)/i, domain: 'subtitles', delta: { subtitleLeadInMs: -80 }, summary: 'Earlier subtitles' },
  { re: /\b(subtitle|captions).*(later|delay)/i, domain: 'subtitles', delta: { subtitleLeadInMs: 120 }, summary: 'Delayed subtitles' }
]

/**
 * @param {string} command
 * @param {number} sceneIndex 1-based
 */
export function parseCopilotCommand(command, sceneIndex) {
  const text = String(command || '').trim()
  if (!text) return []
  const patches = []
  for (const rule of RULES) {
    if (rule.re.test(text)) {
      patches.push({
        sceneIndex,
        domain: rule.domain,
        delta: { ...rule.delta },
        summary: rule.summary
      })
    }
  }
  if (!patches.length) {
    patches.push({
      sceneIndex,
      domain: 'intensity',
      delta: { intensityMul: 1.05 },
      summary: `Adjust scene ${sceneIndex} per: ${text.slice(0, 80)}`
    })
  }
  return patches
}

/**
 * Apply patches to scene plan object (mutable copy returned).
 * @param {object} scenePlan
 * @param {Array<object>} patches
 */
export function applyCopilotPatchesToScene(scenePlan, patches) {
  const sc = { ...scenePlan }
  for (const p of patches) {
    if (p.domain === 'pacing' && sc.pacing) {
      sc.pacing = { ...sc.pacing, beatWeight: Math.min(1, (sc.pacing.beatWeight ?? 0.5) * (p.delta.pacingMul ?? 1)) }
    }
    if (p.domain === 'camera' && sc.camera) {
      sc.camera = {
        ...sc.camera,
        breathing: Math.min(1, (sc.camera.breathing ?? 0.2) * (p.delta.cameraIntensityMul ?? 1)),
        parallaxDepth: Math.min(1, (sc.camera.parallaxDepth ?? 0.3) + (p.delta.parallax ?? 0))
      }
    }
    if (p.domain === 'music' && sc.music) {
      sc.music = { ...sc.music, intensity: Math.min(1, (sc.music.intensity ?? 0.5) * (p.delta.musicIntensityMul ?? 1)) }
    }
    if (p.domain === 'ambience' && sc.environment) {
      sc.environment = {
        ...sc.environment,
        fog: Math.min(1, (sc.environment.fog ?? 0) + (p.delta.fog ?? 0)),
        warmth: Math.max(0, (sc.environment.warmth ?? 0.5) - (p.delta.ambienceMul > 1 ? 0.08 : 0))
      }
    }
    if (p.domain === 'subtitles' && sc.subtitle) {
      sc.subtitle = {
        ...sc.subtitle,
        leadInMs: Math.max(0, (sc.subtitle.leadInMs ?? 0) + (p.delta.subtitleLeadInMs ?? 0))
      }
    }
    if (p.domain === 'acting' && sc.acting) {
      sc.acting = {
        ...sc.acting,
        gestureIntensity: Math.min(1, (sc.acting.gestureIntensity ?? 0.4) * (p.delta.intensityMul ?? 1.1))
      }
    }
  }
  return sc
}
