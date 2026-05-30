import { useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import type { StoryScene } from '../types/story'
import { LiveScriptPreview } from './LiveScriptPreview'
import { StudioSceneCardsTab } from './StudioSceneCardsTab'
import { StoryGenerationDefaultsPicker } from './StoryGenerationDefaultsPicker'
import type { StreamRevealState } from '../store/useStudioStore'
import '../styles/studio-script-workspace.css'

export type StudioScriptTab = 'scenes' | 'script' | 'voice'

type Props = {
  scenes: StoryScene[]
  rawStructured?: string
  busy: boolean
  streamLines: string[]
  streamReveal?: StreamRevealState | null
  focusedSpeaker?: string | null
  onSceneFocus?: (speaker: string, sceneIndex: number) => void
  emptyHint?: string
  activeSceneIndex?: number
  onActiveSceneIndex?: (sceneIndex: number) => void
  sceneThumbUrl?: (scene: StoryScene) => string | undefined
  sceneDurationSec?: (scene: StoryScene) => number | undefined
}

export function StudioScriptWorkspaceTabs({
  scenes,
  rawStructured,
  busy,
  streamLines,
  streamReveal,
  focusedSpeaker,
  onSceneFocus,
  emptyHint,
  activeSceneIndex,
  onActiveSceneIndex,
  sceneThumbUrl,
  sceneDurationSec
}: Props) {
  const uiText = useUiText()
  const [tab, setTab] = useState<StudioScriptTab>('scenes')

  const tabs: { id: StudioScriptTab; label: string }[] = [
    { id: 'scenes', label: uiText('studioTabScenes') },
    { id: 'script', label: uiText('studioTabScript') },
    { id: 'voice', label: uiText('studioTabVoice') }
  ]

  return (
    <div className="studio-script-workspace">
      <div className="studio-script-workspace__tabs" role="tablist" aria-label={uiText('studioScriptWorkspaceAria')}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`studio-script-workspace__tab${tab === t.id ? ' studio-script-workspace__tab--on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="studio-script-workspace__body" role="tabpanel">
        {tab === 'scenes' ? (
          <StudioSceneCardsTab
            scenes={scenes}
            activeSceneIndex={activeSceneIndex}
            onSelectScene={(sceneIndex) => {
              const sc = scenes.find((s) => s.index === sceneIndex)
              onActiveSceneIndex?.(sceneIndex)
              if (sc) onSceneFocus?.(sc.character, sceneIndex)
            }}
            emptyHint={emptyHint}
            sceneThumbUrl={sceneThumbUrl}
            sceneDurationSec={sceneDurationSec}
          />
        ) : null}

        {tab === 'script' ? (
          <LiveScriptPreview
            scenes={scenes}
            rawStructured={rawStructured}
            busy={busy}
            streamLines={streamLines}
            streamReveal={streamReveal}
            focusedSpeaker={focusedSpeaker}
            onSceneFocus={onSceneFocus}
            emptyHint={emptyHint}
            screenplayMode
            activeSceneIndex={activeSceneIndex}
          />
        ) : null}

        {tab === 'voice' ? (
          <div className="studio-script-workspace__voice">
            <StoryGenerationDefaultsPicker embeddedInGeneratedDialog />
          </div>
        ) : null}
      </div>
    </div>
  )
}
