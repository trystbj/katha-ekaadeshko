import { useEffect, useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import type { ProjectState, StoryEpisode } from '../types/story'
import {
  auditEpisodePipelineCompletion,
  deriveNarrationPipelineState,
  type PipelineValidationReport
} from '../utils/pipelineCompletionAudit'
import { resolveSceneImageStatus, sceneTitleForIndex } from '../utils/sceneImageStatus'
import type { UiTranslateFn } from '../i18n/useAppI18n'
import '../styles/pipeline-debug-panel.css'

type Props = {
  project: ProjectState
  episode: StoryEpisode
  cachedReport?: PipelineValidationReport
}

function sceneLineLabel(
  row: PipelineValidationReport['scenes'][0],
  uiText: UiTranslateFn
): string {
  if (row.image === 'ok' && row.preview === 'ok') return uiText('pipelineDebugSceneOk')
  if (row.image === 'black') return uiText('pipelineDebugSceneBlack')
  if (row.image === 'placeholder') return uiText('pipelineDebugScenePlaceholder')
  if (row.image === 'missing') return uiText('pipelineDebugSceneMissingImage')
  return uiText('pipelineDebugSceneFailed')
}

export function PipelineDebugPanel({ project, episode, cachedReport }: Props) {
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
          const status = resolveSceneImageStatus(project, episode.number, row.scene)
          const sc = episode.scenes.find((s) => s.index === row.scene)
          return (
            <li key={row.scene} className={ok ? 'pipeline-debug__scene--ok' : 'pipeline-debug__scene--bad'}>
              <span className="pipeline-debug__mark">{ok ? '✓' : '✗'}</span>{' '}
              {title} ({uiText('pipelineDebugSceneLine', { scene: String(row.scene), status: sceneLineLabel(row, uiText) })}
              {!ok && sc?.imageError ? (
                <span className="pipeline-debug__tag"> — {sc.imageError}</span>
              ) : null}
              {!ok ? (
                <span className="pipeline-debug__tag"> [{status}]</span>
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
