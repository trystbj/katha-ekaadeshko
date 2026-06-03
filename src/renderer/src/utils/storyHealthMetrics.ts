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
  const withVisual = scenes.filter((s) => (s.visual_description || '').trim().length > 50).length
  const uniqueWords = new Set(texts.join(' ').toLowerCase().split(/\W+/).filter((w) => w.length > 3))

  let score = 52
  score += Math.min(18, (avgLen / 120) * 18)
  score += Math.min(16, (withDialogue / scenes.length) * 16)
  score += Math.min(14, (withVisual / scenes.length) * 14)
  score += Math.min(10, uniqueWords.size / 40)
  if (project.bible?.concept && project.bible.concept.length > 20) score += 6
  if (avgLen > 90 && withVisual / scenes.length > 0.7) score = Math.max(score, 92)
  return clampScore(score)
}

function scoreCharacterConsistency(project: ProjectState): number {
  const mem = project.characterIdentityMemory ?? []
  const bible = project.bible?.characters ?? []
  const rows = mem.length ? mem : bible
  if (!rows.length) return 0

  let score = 48
  for (const row of rows) {
    const gender = String('gender' in row ? row.gender : '').toLowerCase()
    const visual = String(
      ('visualIdentity' in row ? row.visualIdentity : '') ||
        ('appearance' in row ? row.appearance : '') ||
        ''
    ).trim()
    if (gender && gender !== 'unknown') score += 10
    if (visual.length > 40) score += 8
    if (project.characterVisualLocks?.length) score += 4
  }
  return clampScore(score / rows.length + 38)
}

function scoreNarrationQuality(episode: StoryEpisode): number {
  const scenes = episode.scenes ?? []
  if (!scenes.length) return 0
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
  if (episode.narrationAudioUrl) score += 8
  if (avg > 80 && emotional / scenes.length > 0.5) score = Math.max(score, 93)
  return clampScore(score)
}

function scoreVisualConsistency(
  episode: StoryEpisode,
  coverage: { total: number; withImage: number; missing: number[] }
): StoryHealthVisualMetric {
  const total = coverage.total || episode.scenes.length
  if (!total) return 'pending'
  if (coverage.withImage === 0) return 'pending'
  const ratio = coverage.withImage / total
  if (ratio < 1 && coverage.withImage > 0) return clampScore(68 + ratio * 28)
  if (ratio >= 1) return clampScore(88 + Math.min(12, total * 2))
  return 'pending'
}

function scoreEmotionProgression(episode: StoryEpisode): number {
  const scenes = episode.scenes ?? []
  if (scenes.length < 2) return clampScore(70)
  const tones = scenes.map((s) =>
    String(s.emotional_tone || s.mood || s.visual_description || s.narration || '').toLowerCase()
  )
  const tensionWords = /tension|fear|conflict|danger|urgent|climax|shock|grief|anger/
  const calmWords = /calm|peace|relief|hope|joy|warm|tender|resolve/
  let shifts = 0
  let tensionRise = 0
  for (let i = 1; i < tones.length; i++) {
    if (tones[i] !== tones[i - 1]) shifts += 1
    const t0 = tensionWords.test(tones[i - 1]) ? 1 : calmWords.test(tones[i - 1]) ? -1 : 0
    const t1 = tensionWords.test(tones[i]) ? 1 : calmWords.test(tones[i]) ? -1 : 0
    if (t1 > t0) tensionRise += 1
  }
  let score = 58 + Math.min(20, (shifts / (scenes.length - 1)) * 20)
  score += Math.min(16, tensionRise * 4)
  if (shifts >= Math.floor(scenes.length / 2)) score = Math.max(score, 90)
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
  coverage: { total: number; withImage: number; missing: number[] }
): StoryHealthMetrics {
  return {
    story: scoreStoryQuality(episode, project),
    character: scoreCharacterConsistency(project),
    narration: scoreNarrationQuality(episode),
    visual: scoreVisualConsistency(episode, coverage),
    emotion: scoreEmotionProgression(episode),
    continuity: scoreContinuity(episode, project)
  }
}
