import { useEffect, useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import type { UiTranslateFn } from '../i18n/useAppI18n'
import type { ProjectState, StoryEpisode } from '../types/story'
import {
  auditEpisodePipelineCompletion,
  deriveNarrationPipelineState,
  type PipelineValidationReport
} from '../utils/pipelineCompletionAudit'
import { sceneTitleForIndex } from '../utils/sceneImageStatus'
import '../styles/pipeline-debug-panel.css'

type Props = {
  project: ProjectState
  episode: StoryEpisode
  cachedReport?: PipelineValidationReport
  onRetryScene?: (sceneIndex: number) => void
}

function statusLabel(
  row: PipelineValidationReport['scenes'][0],
  uiText: UiTranslateFn
): string {
  if (row.image === 'ok' && row.preview === 'ok') return uiText('sceneImageReportCompleted')
  if (row.image === 'black') return uiText('pipelineDebugSceneBlack')
  if (row.image === 'placeholder') return uiText('pipelineDebugScenePlaceholder')
  if (row.image === 'missing') return uiText('sceneImageReportPending')
  return uiText('sceneImageReportFailed')
}

export function PipelineDebugPanel({ project, episode, cachedReport, onRetryScene }: Props) {
  const uiText = useUiText()
  const [report, setReport] = useState<PipelineValidationReport | null>(cachedReport ?? null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (cachedReport) setReport(cachedReport)
  }, [cachedReport])

  useEffect(() => {
    let cancelled = false
    setBusy(true)
    void auditEpisodePipelineCompletion(project, episode.number)
      .then((r) => {
        if (!cancelled) setReport(r)
      })
      .finally(() => {
        if (!cancelled) setBusy(false)
      })
    return () => {
      cancelled = true
    }
  }, [project.updatedAt, project.assets, episode.number, episode.narrationAudioUrl, episode.scenes.length])

  if (!report && busy) {
    return <p className="pipeline-debug__loading">{uiText('pipelineDebugLoading')}</p>
  }
  if (!report) return null

  const narrationState = report.narrationState ?? deriveNarrationPipelineState(episode)

  return (
    <details className="pipeline-debug" open>
      <summary className="pipeline-debug__title">
        {uiText('sceneImageReportTitle')} ({report.validatedImageCount}/{report.totalScenes})
      </summary>
      <ul className="pipeline-debug__scenes">
        {report.scenes.map((row) => {
          const ok = row.image === 'ok' && row.preview === 'ok'
          const title = sceneTitleForIndex(episode, row.scene)
          const label = statusLabel(row, uiText)
          const sc = episode.scenes.find((s) => s.index === row.scene)
          return (
            <li key={row.scene} className={ok ? 'pipeline-debug__scene--ok' : 'pipeline-debug__scene--bad'}>
              <span className="pipeline-debug__mark">{ok ? '✓' : '✗'}</span>{' '}
              {uiText('pipelineDebugSceneLine', { title, status: label })}
              {!ok && sc?.imageError ? (
                <span className="pipeline-debug__tag"> — {sc.imageError}</span>
              ) : null}
              {!ok && onRetryScene ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm pipeline-debug__retry"
                  onClick={() => onRetryScene(row.scene)}
                >
                  {uiText('sceneGenDiagRetryScene', { scene: title })}
                </button>
              ) : null}
            </li>
          )
        })}
      </ul>
      <dl className="pipeline-debug__meta">
        <div>
          <dt>{uiText('pipelineDebugNarrationLabel')}</dt>
          <dd>
            {narrationState === 'audio_ready'
              ? uiText('pipelineDebugNarrationGenerated')
              : narrationState === 'text_only'
                ? uiText('pipelineDebugNarrationTextOnly')
                : uiText('pipelineDebugNarrationMissing')}
          </dd>
        </div>
        <div>
          <dt>{uiText('pipelineDebugExportLabel')}</dt>
          <dd>
            {report.exportReady
              ? uiText('pipelineDebugExportReady')
              : uiText('pipelineDebugExportNotReady')}
          </dd>
        </div>
      </dl>
    </details>
  )
}
