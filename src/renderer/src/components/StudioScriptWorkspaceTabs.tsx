import { useMemo, useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import type { ProjectState, StoryEpisode, StoryScene } from '../types/story'
import { LiveScriptPreview } from './LiveScriptPreview'
import { StoryGenerationDefaultsPicker } from './StoryGenerationDefaultsPicker'
import { StudioSceneSectionPanel } from './StudioSceneSectionPanel'
import { StudioSceneSectionPlaceholder } from './StudioSceneSectionPlaceholder'
import { StoryReadingWorkspace } from './StoryReadingWorkspace'
import type { StreamRevealState } from '../store/useStudioStore'
import type { SmartRegenAction } from './SmartSceneRegenMenu'
import { deriveCinematicProductionGate } from '../utils/cinematicProductionGate'
import '../styles/studio-script-workspace.css'
import '../styles/story-reading-workspace.css'

export type StudioScriptTab = 'scenes' | 'script' | 'voice' | 'story' | 'video'

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
  onRetryFailedScenes?: (sceneIndices?: number[]) => void
  onRetrySceneImage?: (sceneIndex: number) => void
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
  onApproveSceneImages,
  onRetryFailedScenes,
  onRetrySceneImage
}: Props) {
  const uiText = useUiText()
  const [tab, setTab] = useState<StudioScriptTab>(storyGenerated ? 'scenes' : 'script')

  const productionGate = useMemo(
    () =>
      project && episode ? deriveCinematicProductionGate(project, episode.number) : null,
    [project, episode]
  )

  const tabs: { id: StudioScriptTab; label: string }[] = [
    { id: 'scenes', label: uiText('studioTabScenes') },
    { id: 'script', label: uiText('studioTabScript') },
    { id: 'voice', label: uiText('studioTabVoice') },
    { id: 'story', label: uiText('studioTabStory') },
    { id: 'video', label: uiText('studioTabVideo') }
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
        <div
          className={`studio-script-workspace__panel${tab !== 'scenes' ? ' studio-script-workspace__panel--hidden' : ''}`}
          aria-hidden={tab !== 'scenes'}
        >
          {storyGenerated && project && episode ? (
            <StudioSceneSectionPanel
              project={project}
              episode={episode}
              activeSceneIndex={activeIx}
              busyLabel={busyLabel}
              onApproveSceneImages={onApproveSceneImages}
              onRetryFailedScenes={onRetryFailedScenes}
              onRetrySceneImage={onRetrySceneImage}
            />
          ) : (
            <StudioSceneSectionPlaceholder />
          )}
        </div>

        <div
          className={`studio-script-workspace__panel${tab !== 'script' ? ' studio-script-workspace__panel--hidden' : ''}`}
          aria-hidden={tab !== 'script'}
        >
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
        </div>

        <div
          className={`studio-script-workspace__panel studio-script-workspace__voice${tab !== 'voice' ? ' studio-script-workspace__panel--hidden' : ''}`}
          aria-hidden={tab !== 'voice'}
        >
          <StoryGenerationDefaultsPicker embeddedInGeneratedDialog />
        </div>

        <div
          className={`studio-script-workspace__panel${tab !== 'story' ? ' studio-script-workspace__panel--hidden' : ''}`}
          aria-hidden={tab !== 'story'}
        >
          {storyGenerated ? (
            <StoryReadingWorkspace project={project} episode={episode} active={tab === 'story'} />
          ) : (
            <div className="story-reading-workspace story-reading-workspace--empty">
              <p className="story-reading-workspace__empty">{uiText('storyReadingEmpty')}</p>
            </div>
          )}
        </div>

        <div
          className={`studio-script-workspace__panel studio-script-workspace__voice${tab !== 'video' ? ' studio-script-workspace__panel--hidden' : ''}`}
          aria-hidden={tab !== 'video'}
        >
          <p className="studio-script-workspace__video-hint">{uiText('studioVideoTabHint')}</p>
          <button
            type="button"
            className="btn btn-generate-cta studio-script-workspace__video-btn"
            disabled={Boolean(busy)}
            onClick={() => onGenerateFinalVideo?.()}
          >
            {uiText('storyboardGenerateFinalVideo')}
          </button>
          {!productionGate?.canRenderFinalVideo ? (
            <p className="studio-script-workspace__video-status" role="status">
              {!productionGate?.sceneImagesGenerated
                ? uiText('studioVideoNeedImages')
                : !productionGate?.narrationGenerated
                  ? uiText('studioVideoNeedNarration')
                  : uiText('studioVideoNeedValidation')}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
