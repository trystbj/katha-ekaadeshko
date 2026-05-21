import { useMemo } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import type { ProjectState } from '../types/story'
import {
  episodeArcLabelKey,
  resolveOngoingEpisodeNumber
} from '../utils/episodeSeriesFlow'
import { tEpisodePacing } from '../utils/i18nEpisodePacing'

type Props = {
  project: ProjectState
}

/** Story Monitor — one ongoing episode card only (no multi-episode stack). */
export function MonitorEpisodeAccordion({ project }: Props) {
  const uiText = useUiText()
  const bible = project.bible
  const total = bible?.totalEpisodes ?? 0
  const ongoingN = useMemo(() => resolveOngoingEpisodeNumber(project), [project])

  const row = useMemo(() => {
    if (!bible || total < 1) return null
    const ep = project.episodes.find((e) => e.number === ongoingN)
    return {
      n: ongoingN,
      ep,
      written: Boolean(ep),
      videoDone: Boolean(ep?.videoExportComplete),
      arcKey: episodeArcLabelKey(ongoingN, total)
    }
  }, [bible, total, project.episodes, ongoingN])

  if (!bible) {
    return <span className="badge">{uiText('statusNew')}</span>
  }

  if (!row) return null

  const badgeKey = !row.written
    ? 'episodeBadgeOngoing'
    : !row.videoDone
      ? 'episodeBadgeExportPending'
      : 'episodeBadgeExported'

  return (
    <div
      className="monitor-episode-accordion monitor-episode-accordion--single panel studio-mock-panel studio-mock-episodes-panel"
      aria-label={uiText('episodeMonitorOngoingSection')}
    >
      <p className="monitor-ongoing-episode__kicker">{uiText('episodeMonitorOngoingKicker')}</p>
      <div
        className={`episode-row episode-row--ongoing-only current${row.written && !row.videoDone ? ' episode-row--export-pending' : ''}${row.written && row.videoDone ? ' episode-row--exported' : ''}`}
        aria-current="step"
      >
        <span className="episode-row__compact-label">
          {uiText('episodeMonitorRowLabel', {
            n: row.n,
            arc: uiText(row.arcKey),
            pacing: row.ep ? tEpisodePacing(uiText, row.ep.pacing) : uiText('uiEllipsis')
          })}
        </span>
        <span className="badge badge--ongoing">{uiText(badgeKey)}</span>
      </div>
      <p className="monitor-ongoing-episode__hint">{uiText('episodeMonitorArchiveHint')}</p>
    </div>
  )
}
