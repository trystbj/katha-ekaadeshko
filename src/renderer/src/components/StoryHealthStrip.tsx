import { useEffect, useMemo, useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import type { ProjectState, StoryEpisode } from '../types/story'
import { fetchQualityReport } from '../creator/creatorApi'
import { episodeSceneImageCoverage } from '../utils/storyboardWorkflow'

type Props = {
  project: ProjectState
  episode: StoryEpisode
}

function pct(n: number): string {
  return `${Math.round(Math.min(100, Math.max(0, n)))}%`
}

export function StoryHealthStrip({ project, episode }: Props) {
  const uiText = useUiText()
  const [qualityScore, setQualityScore] = useState<number | null>(null)

  const coverage = useMemo(
    () => episodeSceneImageCoverage(project, episode.number),
    [project, episode.number]
  )

  const visualPct = useMemo(() => {
    const total = episode.scenes.length || 1
    const ready = total - coverage.missing.length
    return (ready / total) * 100
  }, [coverage.missing.length, episode.scenes.length])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const { report } = await fetchQualityReport(episode)
        if (!cancelled && typeof report?.score === 'number') setQualityScore(report.score)
      } catch {
        if (!cancelled) setQualityScore(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [episode])

  const castSlots = project.characterIdentityMemory?.length ?? project.bible?.characters.length ?? 0
  const characterPct = castSlots > 0 ? Math.min(100, 72 + castSlots * 6) : 55
  const narrationPct = episode.narrationAudioUrl ? 88 : project.bible ? 62 : 40
  const emotionPct = qualityScore != null ? Math.min(100, qualityScore + 8) : 70
  const continuityPct = project.continuityNotes?.length ? 82 : 68
  const storyPct = qualityScore ?? 74

  const metrics = [
    { key: 'storyHealthStory', value: pct(storyPct) },
    { key: 'storyHealthCharacter', value: pct(characterPct) },
    { key: 'storyHealthNarration', value: pct(narrationPct) },
    { key: 'storyHealthVisual', value: pct(visualPct) },
    { key: 'storyHealthEmotion', value: pct(emotionPct) },
    { key: 'storyHealthContinuity', value: pct(continuityPct) }
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
