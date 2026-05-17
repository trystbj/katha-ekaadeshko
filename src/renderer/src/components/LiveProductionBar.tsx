import { useUiText } from '../i18n/useAppI18n'
import { useProductionPipelineStore } from '../store/useProductionPipelineStore'
import type { PreviewQualityTier, ProductionWorkflowMode } from '../../../../core/realtime/productionTypes'
import '../styles/live-production.css'

const TIERS: PreviewQualityTier[] = ['lightweight', 'cinematic', 'final']

export function LiveProductionBar() {
  const uiText = useUiText()
  const mode = useProductionPipelineStore((s) => s.productionMode)
  const tier = useProductionPipelineStore((s) => s.previewTier)
  const setMode = useProductionPipelineStore((s) => s.setProductionMode)
  const setTier = useProductionPipelineStore((s) => s.setPreviewTier)
  const jobs = useProductionPipelineStore((s) => s.backgroundJobs)
  const activeJob = jobs.find((j) => j.status === 'queued' || j.status === 'processing')

  const tierLabel = (t: PreviewQualityTier) => {
    if (t === 'lightweight') return uiText('livePreviewTierLight')
    if (t === 'final') return uiText('livePreviewTierFinal')
    return uiText('livePreviewTierCinematic')
  }

  return (
    <div className="live-production-bar" role="toolbar" aria-label={uiText('liveProductionBarLabel')}>
      <div className="live-production-bar__modes">
        {(['quick', 'production'] as ProductionWorkflowMode[]).map((m) => (
          <button
            key={m}
            type="button"
            className={`live-production-bar__mode${mode === m ? ' live-production-bar__mode--on' : ''}`}
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
          >
            {m === 'quick' ? uiText('liveModeQuick') : uiText('liveModeProduction')}
          </button>
        ))}
      </div>
      <select
        className="select live-production-bar__tier"
        value={tier}
        onChange={(e) => setTier(e.target.value as PreviewQualityTier)}
        aria-label={uiText('livePreviewTierLabel')}
      >
        {TIERS.map((t) => (
          <option key={t} value={t}>
            {tierLabel(t)}
          </option>
        ))}
      </select>
      {activeJob ? (
        <span className="live-production-bar__render-badge" aria-live="polite">
          {uiText('liveRenderBackground', { stage: activeJob.stage, pct: Math.round(activeJob.progress * 100) })}
        </span>
      ) : null}
    </div>
  )
}
