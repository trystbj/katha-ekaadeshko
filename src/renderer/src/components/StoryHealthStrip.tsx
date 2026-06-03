import { useEffect, useMemo, useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import type { ProjectState, StoryEpisode } from '../types/story'
import { computeStoryHealthMetrics } from '../utils/storyHealthMetrics'
import { episodeSceneImageCoverage } from '../utils/storyboardWorkflow'
import { fetchStoryHealthMetrics } from '../utils/storyHealthAnalysis'

type Props = {
  project: ProjectState
  episode: StoryEpisode
}

function pct(n: number): string {
  return `${Math.round(Math.min(100, Math.max(0, n)))}%`
}

export function StoryHealthStrip({ project, episode }: Props) {
  const uiText = useUiText()

  const coverage = useMemo(
    () => episodeSceneImageCoverage(project, episode.number),
    [project, episode.number]
  )

  const localHealth = useMemo(
    () => computeStoryHealthMetrics(project, episode, coverage),
    [project, episode, coverage]
  )

  const [health, setHealth] = useState(localHealth)
  useEffect(() => {
    setHealth(localHealth)
    let cancelled = false
    void fetchStoryHealthMetrics(project, episode, coverage).then((next) => {
      if (!cancelled) setHealth(next)
    })
    return () => {
      cancelled = true
    }
  }, [localHealth, project, episode, coverage])

  const metrics = [
    { key: 'storyHealthStory', value: pct(health.story) },
    { key: 'storyHealthCharacter', value: pct(health.character) },
    { key: 'storyHealthNarration', value: pct(health.narration) },
    {
      key: 'storyHealthVisual',
      value:
        health.visual === 'pending' ? uiText('storyHealthVisualPending') : pct(health.visual)
    },
    { key: 'storyHealthEmotion', value: pct(health.emotion) },
    { key: 'storyHealthContinuity', value: pct(health.continuity) }
  ]

  return (
    <div className="story-health-strip" role="status" aria-label={uiText('storyHealthTitle')}>
      <span className="story-health-strip__title">{uiText('storyHealthTitle')}</span>
      <ul className="story-health-strip__list">
        {metrics.map((m) => (
          <li key={m.key}>
            <span className="story-health-strip__label">{uiText(m.key)}</span>
            <span className="story-health-strip__value">{m.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
