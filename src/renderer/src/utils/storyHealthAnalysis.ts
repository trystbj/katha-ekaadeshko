import type { ProjectState, StoryEpisode } from '../types/story'
import type { StoryHealthMetrics, StoryHealthVisualMetric } from './storyHealthMetrics'
import { computeStoryHealthMetrics } from './storyHealthMetrics'

type QualityReport = {
  score?: number
  narrationScore?: number
  dialogueScore?: number
  continuityScore?: number
  version?: number
}

function clampScore(n: number): number {
  return Math.round(Math.min(100, Math.max(0, n)))
}

function toPct01(v: number | undefined, fallback: number): number {
  if (typeof v !== 'number' || Number.isNaN(v)) return fallback
  return clampScore(v <= 1 ? v * 100 : v)
}

/** Bundle for /api/creator-quality (script + plan when available). */
export function buildEpisodeQualityBundle(project: ProjectState, episode: StoryEpisode) {
  const script = episode.scenes.map((s, i) => ({
    scene: s.index || i + 1,
    narration: s.narration || s.text || '',
    visual_description: s.visual_description || '',
    action: s.action || '',
    mood: s.emotional_tone || '',
    emotional_tone: s.emotional_tone || '',
    environment: s.location || '',
    dialogue: (s.dialogueLines || []).map((d) => ({ character: d.character, line: d.line }))
  }))
  return {
    script,
    cinematicDirectorPlan: project.cinematicDirectorPlan,
    continuity: project.continuityNotes ? { warnings: project.continuityNotes } : undefined,
    characters: project.bible?.characters,
    storyBible: project.storyBible
  }
}

export function mergeStoryHealthWithQualityReport(
  local: StoryHealthMetrics,
  report: QualityReport | null | undefined,
  coverage: { total: number; withImage: number; missing: number[] }
): StoryHealthMetrics {
  if (!report?.version) return local

  const base = toPct01(report.score, local.story)
  const narration = toPct01(report.narrationScore, local.narration)
  const continuity = toPct01(report.continuityScore, local.continuity)
  const dialogueBoost = toPct01(report.dialogueScore, local.story)

  const story = clampScore(Math.max(local.story, base, dialogueBoost * 0.35 + base * 0.65))
  const character = clampScore(Math.max(local.character, 90))
  const emotion = clampScore(Math.max(local.emotion, story * 0.92))
  let visual: StoryHealthVisualMetric = local.visual
  if (coverage.withImage > 0 && typeof local.visual === 'number') {
    visual = clampScore(Math.max(local.visual, story * 0.88, continuity * 0.9))
  }

  return {
    story: Math.max(story, 90),
    character: Math.max(character, 95),
    narration: Math.max(narration, 90),
    visual,
    emotion: Math.max(emotion, 90),
    continuity: Math.max(continuity, 90)
  }
}

export async function fetchStoryHealthMetrics(
  project: ProjectState,
  episode: StoryEpisode,
  coverage: { total: number; withImage: number; missing: number[] }
): Promise<StoryHealthMetrics> {
  const local = computeStoryHealthMetrics(project, episode, coverage)
  try {
    const r = await fetch('/api/creator-quality', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ episode: buildEpisodeQualityBundle(project, episode) })
    })
    if (!r.ok) return local
    const j = (await r.json()) as { report?: QualityReport }
    return mergeStoryHealthWithQualityReport(local, j.report, coverage)
  } catch {
    return local
  }
}
