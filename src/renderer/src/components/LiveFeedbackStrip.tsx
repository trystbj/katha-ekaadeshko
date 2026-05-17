import { useUiText } from '../i18n/useAppI18n'
import type { LiveFeedbackReport } from '../../../../core/realtime/productionTypes'
import '../styles/live-production.css'

type Props = {
  report: LiveFeedbackReport | null
  onRefresh?: () => void
  busy?: boolean
}

export function LiveFeedbackStrip({ report, onRefresh, busy }: Props) {
  const uiText = useUiText()

  return (
    <div className="live-feedback-strip">
      <div className="live-feedback-strip__head">
        <span className="live-feedback-strip__title">{uiText('liveFeedbackTitle')}</span>
        {onRefresh ? (
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={onRefresh}>
            {uiText('liveFeedbackRefresh')}
          </button>
        ) : null}
      </div>
      {!report ? (
        <p className="live-feedback-strip__empty">{uiText('liveFeedbackEmpty')}</p>
      ) : (
        <>
          <p className="live-feedback-strip__score">
            {uiText('creatorQualityScore')} {uiText('creatorQualityScoreValue', { pct: Math.round(report.score * 100) })}
          </p>
          <ul className="live-feedback-strip__list">
            {report.suggestions.slice(0, 5).map((s) => (
              <li key={s.id} className={`live-feedback-strip__item live-feedback-strip__item--${s.severity}`}>
                {s.message}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
