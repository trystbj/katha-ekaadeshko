import { useEffect, useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import type { ProjectState, StoryEpisode } from '../types/story'
import {
  auditEpisodePipelineCompletion,
  deriveNarrationPipelineState,
  type PipelineValidationReport
} from '../utils/pipelineCompletionAudit'
import '../styles/pipeline-debug-panel.css'

type Props = {
  project: ProjectState
  episode: StoryEpisode
  cachedReport?: PipelineValidationReport
}

import type { UiTranslateFn } from '../i18n/useAppI18n'

function sceneLineLabel(row: PipelineValidationReport['scenes'][0], uiText: UiTranslateFn): string {
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
  const narrationKey =
    narrationState === 'audio_ready'
      ? 'pipelineDebugNarrationGenerated'
      : narrationState === 'text_only'
        ? 'pipelineDebugNarrationTextOnly'
        : 'pipelineDebugNarrationMissing'

  const audioKey =
    narrationState === 'audio_ready'
      ? 'pipelineDebugAudioGenerated'
      : 'pipelineDebugAudioMissing'

  const exportKey = report.exportReady
    ? 'pipelineDebugExportReady'
    : 'pipelineDebugExportNotReady'

  return (
    <details className="pipeline-debug" open>
      <summary className="pipeline-debug__title">
        {uiText('pipelineDebugTitle')} ({report.healthPercent}%)
      </summary>
      <ul className="pipeline-debug__scenes">
        {report.scenes.map((row) => (
          <li key={row.scene}>
            {uiText('pipelineDebugSceneLine', {
              scene: String(row.scene),
              status: sceneLineLabel(row, uiText)
            })}
            {row.narrationText === 'missing' ? (
              <span className="pipeline-debug__tag"> · {uiText('pipelineDebugMissingNarrationText')}</span>
            ) : null}
          </li>
        ))}
      </ul>
      <dl className="pipeline-debug__meta">
        <div>
          <dt>{uiText('pipelineDebugNarrationLabel')}</dt>
          <dd>{uiText(narrationKey)}</dd>
        </div>
        <div>
          <dt>{uiText('pipelineDebugAudioLabel')}</dt>
          <dd>{uiText(audioKey)}</dd>
        </div>
        <div>
          <dt>{uiText('pipelineDebugExportLabel')}</dt>
          <dd>{uiText(exportKey)}</dd>
        </div>
      </dl>
      {report.blockers.length ? (
        <ul className="pipeline-debug__blockers">
          {report.blockers.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ) : null}
    </details>
  )
}
