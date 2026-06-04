import { useUiText } from '../i18n/useAppI18n'
import type { VisualSceneDiagnostic } from '../types/visualGeneration'

type Props = {
  rows: VisualSceneDiagnostic[]
  visible?: boolean
}

export function VisualGenerationDiagnosticsPanel({ rows, visible = true }: Props) {
  const uiText = useUiText()
  if (!visible || !rows.length) return null

  return (
    <details className="visual-gen-diagnostics" open>
      <summary className="visual-gen-diagnostics__title">{uiText('visualDiagnosticsTitle')}</summary>
      <div className="visual-gen-diagnostics__table-wrap">
        <table className="visual-gen-diagnostics__table">
          <thead>
            <tr>
              <th>{uiText('visualDiagScene')}</th>
              <th>{uiText('visualDiagPromptLen')}</th>
              <th>{uiText('visualDiagProvider')}</th>
              <th>{uiText('visualDiagStatus')}</th>
              <th>{uiText('visualDiagRetries')}</th>
              <th>{uiText('visualDiagTime')}</th>
              <th>{uiText('visualDiagError')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.scene} className={`visual-gen-diagnostics__row--${r.status}`}>
                <td>{r.scene}</td>
                <td>{r.promptLength}</td>
                <td>{r.provider}</td>
                <td>{r.status}</td>
                <td>{r.retryCount}</td>
                <td>{r.durationMs ? `${(r.durationMs / 1000).toFixed(1)}s` : '—'}</td>
                <td title={r.errorMessage || ''}>
                  {r.errorCode || r.errorMessage
                    ? `${r.errorCode || ''} ${(r.errorMessage || '').slice(0, 80)}`.trim()
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
