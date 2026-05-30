import { useEffect, useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import { Glyphs } from '../i18n/uiGlyphs'
import { useStudioStore } from '../store/useStudioStore'
import { WorkspaceSlotsDashboard } from './WorkspaceSlotsDashboard'
import '../styles/saved-projects-window.css'
import '../styles/monitor-settings-panel.css'

type Props = {
  onClose: () => void
  onOpenHelpCenter?: () => void
  onRequestAuth?: () => void
  onSignOut?: () => void | Promise<void>
  onStartNewStory?: () => void
}

export function MonitorSettingsPanel({
  onClose,
  onOpenHelpCenter,
  onRequestAuth,
  onSignOut,
  onStartNewStory
}: Props) {
  const uiText = useUiText()
  const authEmail = useStudioStore((s) => s.authEmail)
  const [mode, setMode] = useState<'online' | 'offline'>('offline')

  useEffect(() => {
    void (async () => {
      const k = window.katha
      if (!k) return
      const m = await k.settingsGetApiKeys()
      const hasText = Boolean(m.hasOpenAI || m.hasGemini || m.hasDeepSeek)
      setMode(hasText ? 'online' : 'offline')
    })()
  }, [])

  return (
    <div className="saved-projects-window saved-projects-window--monitor monitor-settings-panel">
      <header className="saved-projects-window__head monitor-settings-panel__head">
        <div className="saved-projects-window__head-main">
          <button
            type="button"
            className="saved-projects-window__back"
            aria-label={uiText('close')}
            title={uiText('close')}
            onClick={onClose}
          >
            {Glyphs.arrowLeft}
          </button>
          <div>
            <h1 className="saved-projects-window__title">{uiText('settings')}</h1>
          </div>
        </div>
      </header>

      <div className="monitor-settings-panel__scroll">
        <div className="panel monitor-settings-panel__block">
          <h3>{uiText('workspaceSlotsSectionTitle')}</h3>
          <WorkspaceSlotsDashboard />
          {onStartNewStory ? (
            <button
              type="button"
              className="btn btn-ghost btn-small"
              style={{ marginTop: 10 }}
              onClick={() => onStartNewStory()}
            >
              {uiText('startNewStory')}
            </button>
          ) : null}
        </div>

        <div className="panel monitor-settings-panel__block">
          <h3>{uiText('settingsHelpCenterSectionTitle')}</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: '0 0 10px', lineHeight: 1.5 }}>
            {uiText('helpCenterBlurb')}
          </p>
          <button type="button" className="btn btn-small" onClick={() => onOpenHelpCenter?.()}>
            {uiText('helpCenterOpenButton')}
          </button>
          <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginTop: 12 }}>{uiText('userGuideSettingsNote')}</p>
        </div>

        <div className="panel monitor-settings-panel__block">
          <h3>{uiText('modeLabel')}</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: '0 0 8px' }}>{uiText('modeExplain')}</p>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{mode === 'online' ? uiText('modeOnline') : uiText('modeOffline')}</span>
          </div>
          {mode === 'offline' ? (
            <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '10px 0 0' }}>{uiText('modeOfflineHint')}</p>
          ) : null}
        </div>

        <div className="panel monitor-settings-panel__block">
          <h3>{uiText('accountSectionTitle')}</h3>
          {authEmail ? (
            <div
              className="row"
              style={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}
            >
              <span style={{ fontSize: '0.85rem' }}>{authEmail}</span>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => void onSignOut?.()}>
                {uiText('signOut')}
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-small" onClick={() => onRequestAuth?.()}>
              {uiText('signIn')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
