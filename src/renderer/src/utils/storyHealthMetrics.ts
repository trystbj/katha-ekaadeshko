import type { ProjectState, StoryEpisode, StoryScene } from '../types/story'

export type StoryHealthVisualMetric = number | 'pending'

export type StoryHealthMetrics = {
  story: number
  character: number
  narration: number
  visual: StoryHealthVisualMetric
  emotion: number
  continuity: number
}

function clampScore(n: number): number {
  return Math.round(Math.min(100, Math.max(0, n)))
}

function sceneTexts(scenes: StoryScene[]): string[] {
  return scenes.map((s) =>
    [
      s.visual_description,
      s.narration,
      s.action,
      ...(s.dialogueLines?.map((d) => d.line) ?? [])
    ]
      .filter(Boolean)
      .join(' ')
  )
}

function scoreStoryQuality(episode: StoryEpisode, project: ProjectState): number {
  const scenes = episode.scenes ?? []
  if (!scenes.length) return 0
  const texts = sceneTexts(scenes)
  const avgLen = texts.reduce((a, t) => a + t.length, 0) / scenes.length
  const withDialogue = scenes.filter((s) => (s.dialogueLines?.length ?? 0) > 0).length
  const dialogueLines = scenes.reduce((a, s) => a + (s.dialogueLines?.length ?? 0), 0)
  const withVisual = scenes.filter((s) => (s.visual_description || '').trim().length > 80).length
  const uniqueWords = new Set(texts.join(' ').toLowerCase().split(/\W+/).filter((w) => w.length > 3))
  const pacingVariety = new Set(scenes.map((s) => String(s.emotional_tone || s.mood || '').trim())).size
  const plotSignals = texts.join(' ').toLowerCase()
  let plotBonus = 0
  if (/\b(because|after|finally|until|discover|reveal|confront|choose)\b/.test(plotSignals)) plotBonus += 6
  if (scenes.length >= 6) plotBonus += 4

  let score = 52
  score += Math.min(22, (avgLen / 130) * 22)
  score += Math.min(14, (withDialogue / scenes.length) * 14)
  score += Math.min(10, (dialogueLines / Math.max(1, scenes.length * 3)) * 10)
  score += Math.min(14, (withVisual / scenes.length) * 14)
  score += Math.min(8, uniqueWords.size / 50)
  score += Math.min(8, pacingVariety * 2.5)
  score += plotBonus
  if (project.bible?.concept && project.bible.concept.length > 20) score += 5
  if (project.storyBible) score += 4
  if (avgLen > 100 && withDialogue / scenes.length > 0.45 && dialogueLines >= scenes.length * 2) {
    score = Math.max(score, 88)
  }
  return clampScore(score)
}

function scoreCharacterConsistency(project: ProjectState): number {
  const mem = project.characterIdentityMemory ?? []
  const bible = project.bible?.characters ?? []
  const rows = mem.length ? mem : bible
  if (!rows.length) return 0

  let total = 0
  for (const row of rows) {
    let slot = 50
    const gender = String('gender' in row ? row.gender : '').toLowerCase()
    const visual = String(
      ('visualIdentity' in row ? row.visualIdentity : '') ||
        ('appearance' in row ? row.appearance : '') ||
        ''
    ).trim()
    if (gender && gender !== 'unknown') slot += 18
    if (visual.length > 60) slot += 16
    if (visual.length > 120) slot += 8
    if (project.characterVisualLocks?.length) slot += 6
    const ch = bible.find(
      (c) => c.name.trim().toLowerCase() === String('label' in row ? row.label : row.name || '').toLowerCase()
    )
    if (ch?.baseImageUrl) slot += 10
    const dna = (ch as { characterDNA?: { locked?: boolean; regionalOrigin?: string } }).characterDNA
    if (dna?.locked) slot += 8
    if (dna?.regionalOrigin) slot += 4
    const outfit = (ch as { outfitLock?: { locked?: boolean } }).outfitLock
    if (outfit?.locked) slot += 4
    total += slot
  }
  const avg = total / rows.length
  return clampScore(avg > 88 ? avg : Math.min(98, avg + 8))
}

function scoreNarrationQuality(
  episode: StoryEpisode,
  narrationState?: 'none' | 'text_only' | 'audio_ready'
): number {
  const scenes = episode.scenes ?? []
  if (!scenes.length) return 0
  if (narrationState === 'none') return Math.min(40, scoreNarrationTextOnly(episode, 0))
  if (narrationState === 'text_only') return Math.min(78, scoreNarrationTextOnly(episode, 72))
  let score = 50
  const narrations = scenes.map((s) => String(s.narration || s.text || '').trim())
  const avg = narrations.reduce((a, t) => a + t.length, 0) / scenes.length
  const sensory = narrations.filter((t) => /\b(hear|see|feel|smell|touch|warm|cold|light|shadow)\b/i.test(t))
    .length
  const emotional = narrations.filter((t) => /\b(fear|joy|hope|grief|love|anger|tension|relief)\b/i.test(t))
    .length

  score += Math.min(22, (avg / 100) * 22)
  score += Math.min(14, (sensory / scenes.length) * 14)
  score += Math.min(14, (emotional / scenes.length) * 14)
  if (episode.narrationAudioUrl || narrationState === 'audio_ready') score += 8
  if (avg > 80 && emotional / scenes.length > 0.5) score = Math.max(score, 88)
  if (narrationState === 'audio_ready' && avg > 60) score = Math.max(score, 92)
  return clampScore(narrationState === 'audio_ready' ? score : Math.min(score, 85))
}

function scoreNarrationTextOnly(episode: StoryEpisode, base: number): number {
  const scenes = episode.scenes ?? []
  if (!scenes.length) return base
  const narrations = scenes.map((s) => String(s.narration || s.text || '').trim())
  const avg = narrations.reduce((a, t) => a + t.length, 0) / scenes.length
  return clampScore(base + Math.min(28, (avg / 100) * 28))
}

function scoreVisualConsistency(
  episode: StoryEpisode,
  project: ProjectState,
  coverage: { total: number; withImage: number; missing: number[] },
  pipelineReport?: ProjectState['pipelineValidationReport']
): StoryHealthVisualMetric {
  const total = coverage.total || episode.scenes.length
  if (!total) return 'pending'
  if (coverage.withImage === 0) return 'pending'
  const validated =
    pipelineReport?.episodeNumber === episode.number
      ? pipelineReport.validatedImageCount
      : 0
  const ratio =
    pipelineReport && pipelineReport.totalScenes === total
      ? validated / total
      : coverage.withImage / total
  let score = 52 + ratio * 36
  if (project.storyboardReady && ratio >= 1 && validated === total) score += 10
  if (project.bible?.styleId) score += 4
  const visualDescScore =
    episode.scenes.filter((s) => (s.visual_description || '').trim().length > 70).length / total
  score += visualDescScore * 8
  if (ratio < 1 || validated < total) return clampScore(score)
  const briefAligned =
    episode.scenes.filter((s) => /\b(WHAT:|WHO:|Story event)/i.test(s.visual_description || '')).length /
    total
  if (briefAligned > 0.5) score += 6
  if (project.storyBible) score += 4
  if (project.bible?.characters?.some((c) => (c as { characterDNA?: { locked?: boolean } }).characterDNA?.locked)) {
    score += 6
  }
  if (pipelineReport?.animationReady) return 100
  return clampScore(Math.min(96, score))
}

function emotionBand(text: string): 'calm' | 'rise' | 'peak' | 'resolve' | 'neutral' {
  const t = text.toLowerCase()
  if (/climax|peak|shock|terror|breakdown|confession|confront|betray/.test(t)) return 'peak'
  if (/relief|resolve|peace|hope|warm|tender|home|embrace|smile/.test(t)) return 'resolve'
  if (/fear|anger|tension|urgent|danger|grief|doubt|anxious|conflict/.test(t)) return 'rise'
  if (/curious|wonder|quiet|dawn|first|begin|gentle/.test(t)) return 'calm'
  return 'neutral'
}

function scoreEmotionProgression(episode: StoryEpisode): number {
  const scenes = episode.scenes ?? []
  if (scenes.length < 2) return clampScore(70)
  const tones = scenes.map((s) =>
    String(
      `${s.emotional_tone || ''} ${s.mood || ''} ${s.narration || s.text || ''} ${s.visual_description || ''}`
    ).toLowerCase()
  )
  const bands = tones.map(emotionBand)
  let shifts = 0
  let arcScore = 0
  for (let i = 1; i < bands.length; i++) {
    if (bands[i] !== bands[i - 1]) shifts += 1
  }
  const hasCalmOpen = bands.slice(0, Math.ceil(scenes.length * 0.25)).some((b) => b === 'calm' || b === 'neutral')
  const hasRiseMid = bands.slice(Math.floor(scenes.length * 0.25), Math.floor(scenes.length * 0.75)).some(
    (b) => b === 'rise' || b === 'peak'
  )
  const hasPeakLate = bands.slice(Math.floor(scenes.length * 0.55)).some((b) => b === 'peak' || b === 'rise')
  const hasResolveEnd = bands.slice(-Math.max(1, Math.ceil(scenes.length * 0.2))).some(
    (b) => b === 'resolve' || b === 'calm'
  )
  if (hasCalmOpen) arcScore += 12
  if (hasRiseMid) arcScore += 14
  if (hasPeakLate) arcScore += 16
  if (hasResolveEnd) arcScore += 12

  let score = 48 + Math.min(22, (shifts / (scenes.length - 1)) * 22) + arcScore
  if (hasCalmOpen && hasRiseMid && hasPeakLate) score = Math.max(score, 85)
  if (hasCalmOpen && hasRiseMid && hasPeakLate && hasResolveEnd) score = Math.max(score, 92)
  return clampScore(score)
}

function scoreContinuity(episode: StoryEpisode, project: ProjectState): number {
  const scenes = episode.scenes ?? []
  if (scenes.length < 2) return clampScore(72)
  let score = 60
  const locations = scenes.map((s) =>
    String(s.location || s.visual_description || '')
      .toLowerCase()
      .slice(0, 80)
  )
  let locShifts = 0
  for (let i = 1; i < locations.length; i++) {
    if (locations[i] && locations[i - 1] && locations[i] !== locations[i - 1]) locShifts += 1
  }
  score += Math.min(18, locShifts * 3)
  if (project.continuityNotes?.length) score += 10
  if (project.masterStoryContext) score += 8
  const castStable = (project.characterIdentityMemory?.length ?? 0) >= 2
  if (castStable) score += 8
  return clampScore(score)
}

export function computeStoryHealthMetrics(
  project: ProjectState,
  episode: StoryEpisode,
  coverage: { total: number; withImage: number; missing: number[] },
  pipelineReport?: ProjectState['pipelineValidationReport']
): StoryHealthMetrics {
  const narrState =
    pipelineReport?.episodeNumber === episode.number
      ? pipelineReport.narrationState
      : deriveNarrationStateFromEpisode(episode)
  const metrics = {
    story: scoreStoryQuality(episode, project),
    character: scoreCharacterConsistency(project),
    narration: scoreNarrationQuality(episode, narrState),
    visual: scoreVisualConsistency(episode, project, coverage, pipelineReport),
    emotion: scoreEmotionProgression(episode),
    continuity: scoreContinuity(episode, project)
  }
  if (pipelineReport?.animationReady) {
    return {
      story: Math.min(100, Math.max(metrics.story, 92)),
      character: Math.min(100, Math.max(metrics.character, 92)),
      narration: 100,
      visual: 100,
      emotion: Math.min(100, Math.max(metrics.emotion, 90)),
      continuity: Math.min(100, Math.max(metrics.continuity, 90))
    }
  }
  return metrics
}

function deriveNarrationStateFromEpisode(
  episode: StoryEpisode
): 'none' | 'text_only' | 'audio_ready' {
  if (episode.narrationAudioUrl?.trim()) return 'audio_ready'
  const hasText = (episode.scenes ?? []).some((s) => String(s.narration || s.text || '').trim())
  return hasText ? 'text_only' : 'none'
}
