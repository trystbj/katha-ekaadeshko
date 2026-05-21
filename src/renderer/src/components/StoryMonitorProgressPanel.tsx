import { useMemo } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import { Glyphs } from '../i18n/uiGlyphs'
import { cinematicStageLabelKey } from '../utils/cinematicStageLabel'
import { liveScriptPhaseKey } from '../utils/liveGenerationPresentation'
import type { StreamRevealState } from '../store/useStudioStore'

type JobSlice = {
  stage: string
  progress: number
} | null

type Props = {
  busyLabel: string | null
  job: JobSlice
  streamReveal: StreamRevealState | null
  sceneCountEstimate?: number
}

export function StoryMonitorProgressPanel({
  busyLabel,
  job,
  streamReveal,
  sceneCountEstimate = 0
}: Props) {
  const uiText = useUiText()

  const progressPct = useMemo(() => {
    if (typeof job?.progress === 'number' && Number.isFinite(job.progress)) {
      return Math.min(100, Math.max(0, Math.round(job.progress)))
    }
    if (streamReveal && streamReveal.fullDoc.length > 0) {
      return Math.round((streamReveal.visibleLen / streamReveal.fullDoc.length) * 100)
    }
    return 12
  }, [job?.progress, streamReveal])

  const stageKey = streamReveal
    ? liveScriptPhaseKey(streamReveal)
    : cinematicStageLabelKey(job?.stage || '', '')

  const modeKey = streamReveal ? 'monitorProgressReveal' : 'monitorProgressGenerating'

  return (
    <section className="monitor-progress-panel" aria-labelledby="monitor-progress-title">
      <h3 id="monitor-progress-title" className="monitor-progress-panel__title">
        {uiText('storyMonitor')}
      </h3>
      <p className="monitor-progress-panel__mode">{uiText(modeKey)}</p>
      <p className="monitor-progress-panel__hint">{uiText('studioMonitorLiveInScriptPanel')}</p>

      <div className="monitor-progress-panel__ring-wrap" aria-hidden>
        <svg className="monitor-progress-panel__ring" viewBox="0 0 40 40">
          <circle className="monitor-progress-panel__ring-track" cx="20" cy="20" r="16" />
          <circle
            className="monitor-progress-panel__ring-fill"
            cx="20"
            cy="20"
            r="16"
            strokeDasharray={2 * Math.PI * 16}
            strokeDashoffset={2 * Math.PI * 16 * (1 - progressPct / 100)}
          />
        </svg>
        <span className="monitor-progress-panel__pct">
          {progressPct}
          {Glyphs.percent}
        </span>
      </div>

      <p className="monitor-progress-panel__stage" aria-live="polite">
        {uiText(stageKey)}
      </p>

      {busyLabel ? (
        <p className="monitor-progress-panel__busy">
          <span className="monitor-progress-panel__busy-label">{uiText('monitorProgressTask')}</span>
          {busyLabel}
        </p>
      ) : null}

      {sceneCountEstimate > 0 ? (
        <p className="monitor-progress-panel__scenes">
          {uiText('monitorProgressSceneEstimate', { n: sceneCountEstimate })}
        </p>
      ) : null}

      <ul className="monitor-progress-panel__checklist" aria-label={uiText('monitorProgressChecklistAria')}>
        <li className={progressPct >= 18 ? 'monitor-progress-panel__check--on' : ''}>
          {uiText('monitorProgressCheckWriting')}
        </li>
        <li className={progressPct >= 42 ? 'monitor-progress-panel__check--on' : ''}>
          {uiText('monitorProgressCheckScenes')}
        </li>
        <li className={progressPct >= 68 ? 'monitor-progress-panel__check--on' : ''}>
          {uiText('monitorProgressCheckNarration')}
        </li>
        <li className={progressPct >= 92 ? 'monitor-progress-panel__check--on' : ''}>
          {uiText('monitorProgressCheckReview')}
        </li>
      </ul>
    </section>
  )
}
