import { useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import type { ProjectState, StoryEpisode, StoryScene } from '../types/story'
import { LiveScriptPreview } from './LiveScriptPreview'
import { StoryGenerationDefaultsPicker } from './StoryGenerationDefaultsPicker'
import { StudioSceneSectionPanel } from './StudioSceneSectionPanel'
import { StudioSceneSectionPlaceholder } from './StudioSceneSectionPlaceholder'
import type { StreamRevealState } from '../store/useStudioStore'
import type { SmartRegenAction } from './SmartSceneRegenMenu'
import '../styles/studio-script-workspace.css'

export type StudioScriptTab = 'scenes' | 'script' | 'voice'

type Props = {
  project: ProjectState | null
  episode: StoryEpisode | null | undefined
  storyGenerated: boolean
  scenes: StoryScene[]
  rawStructured?: string
  busy: boolean
  busyLabel?: string | null
  streamLines: string[]
  streamReveal?: StreamRevealState | null
  focusedSpeaker?: string | null
  onSceneFocus?: (speaker: string, sceneIndex: number) => void
  emptyHint?: string
  activeSceneIndex?: number
  onActiveSceneIndex?: (sceneIndex: number) => void
  onSmartRegen?: (sceneIndex: number, action: SmartRegenAction) => void
  onRegenerateMissingSceneImages?: () => void
  onGenerateFinalVideo?: () => void
  onApproveSceneImages?: () => void
}

export function StudioScriptWorkspaceTabs({
  project,
  episode,
  storyGenerated,
  scenes,
  rawStructured,
  busy,
  busyLabel = null,
  streamLines,
  streamReveal,
  focusedSpeaker,
  onSceneFocus,
  emptyHint,
  activeSceneIndex,
  onSmartRegen,
  onRegenerateMissingSceneImages,
  onGenerateFinalVideo,
  onApproveSceneImages
}: Props) {
  const uiText = useUiText()
  const [tab, setTab] = useState<StudioScriptTab>(storyGenerated ? 'scenes' : 'script')

  const tabs: { id: StudioScriptTab; label: string }[] = [
    { id: 'scenes', label: uiText('studioTabScenes') },
    { id: 'script', label: uiText('studioTabScript') },
    { id: 'voice', label: uiText('studioTabVoice') }
  ]

  const activeIx = activeSceneIndex ?? scenes[0]?.index ?? 1

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
          storyGenerated && project && episode ? (
            <StudioSceneSectionPanel
              project={project}
              episode={episode}
              activeSceneIndex={activeIx}
              busyLabel={busyLabel}
              onSmartRegen={onSmartRegen}
              onRegenerateMissingSceneImages={onRegenerateMissingSceneImages}
              onGenerateFinalVideo={onGenerateFinalVideo}
              onApproveSceneImages={onApproveSceneImages}
            />
          ) : (
            <StudioSceneSectionPlaceholder />
          )
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
            activeSceneIndex={storyGenerated ? activeIx : undefined}
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
