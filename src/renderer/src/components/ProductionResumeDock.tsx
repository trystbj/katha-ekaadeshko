import { useEffect, useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import type { ProductionResume } from '../utils/productionResume'

type Props = {
  visible: boolean
  busy: boolean
  productionResume: ProductionResume | null
  showScriptReview: boolean
  onResume: () => void
  onReopenScriptReview: () => void
  onStartNewStory: () => void
}

/** Fixed bottom bar — always visible when a saved story is loaded (not buried in the story column). */
export function ProductionResumeDock({
  visible,
  busy,
  productionResume,
  showScriptReview,
  onResume,
  onReopenScriptReview,
  onStartNewStory
}: Props) {
  const uiText = useUiText()
  const [apiBuild, setApiBuild] = useState<string | null>(null)
  const uiBuild =
    typeof __KATHA_UI_BUILD__ !== 'undefined' ? String(__KATHA_UI_BUILD__).trim() : 'dev'

  useEffect(() => {
    if (!visible) return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as { build?: string }
        if (!cancelled && data.build) setApiBuild(String(data.build))
      } catch {
        /* offline / local vite without api */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [visible])

  if (!visible || !productionResume) return null

  return (
    <div className="production-resume-dock" role="region" aria-label={uiText('productionResumeDockAria')}>
      <p className="production-resume-dock__hint">
        {uiText(productionResume.hintKey, {
          missing: String(productionResume.coverage.missing),
          total: String(productionResume.coverage.total)
        })}
      </p>
      <div className="production-resume-dock__actions">
        <button
          type="button"
          className="btn btn-generate-cta production-resume-dock__primary"
          disabled={busy}
          onClick={onResume}
        >
          {busy ? uiText('storyboardRegeneratingImages') : uiText(productionResume.labelKey)}
        </button>
        {!showScriptReview ? (
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={onReopenScriptReview}>
            {uiText('reopenScriptReview')}
          </button>
        ) : null}
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={onStartNewStory}>
          {uiText('startNewStory')}
        </button>
      </div>
      <p className="production-resume-dock__build" aria-hidden={false}>
        {uiText('productionResumeBuildStamp', { ui: uiBuild, api: apiBuild || '—' })}
      </p>
    </div>
  )
}
