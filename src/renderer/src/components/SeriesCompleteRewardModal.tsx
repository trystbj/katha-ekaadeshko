import { useEffect, useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'
type Props = {
  open: boolean
  title: string
  onClose: () => void
  onAction: (kind: 'merge' | 'season' | 'publish' | 's2') => void
}

export function SeriesCompleteRewardModal({ open, title, onClose, onAction }: Props) {
  const uiText = useUiText()
  const [hint, setHint] = useState<string | null>(null)

  useEffect(() => {
    if (open) setHint(null)
  }, [open])

  if (!open) return null

  const pick = (kind: 'merge' | 'season' | 'publish' | 's2') => {
    setHint(uiText('seriesRewardSoon'))
    onAction(kind)
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal series-reward-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="series-reward-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="series-reward-modal__burst" aria-hidden />
        <h2 id="series-reward-title" className="series-reward-modal__title">
          {uiText('seriesRewardTitle')}
        </h2>
        <p className="series-reward-modal__subtitle">{title}</p>
        <p className="series-reward-modal__lead">{uiText('seriesRewardLead')}</p>
        {hint ? <p className="series-reward-modal__hint">{hint}</p> : null}
        <div className="series-reward-modal__actions">
          <button type="button" className="btn" onClick={() => pick('merge')}>
            {uiText('seriesRewardMergeMovie')}
          </button>
          <button type="button" className="btn" onClick={() => pick('season')}>
            {uiText('seriesRewardExportSeason')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => pick('publish')}>
            {uiText('seriesRewardPublishEpisodic')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => pick('s2')}>
            {uiText('seriesRewardSeasonTwo')}
          </button>
        </div>
        <button type="button" className="btn btn-ghost series-reward-modal__close" onClick={onClose}>
          {uiText('seriesRewardClose')}
        </button>
      </div>
    </div>
  )
}
