import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import type { ProjectState, StoryEpisode, StoryScene } from '../types/story'
import { LiveScriptPreview } from './LiveScriptPreview'
import { ScriptReviewWorkspace } from './ScriptReviewWorkspace'
import { StoryGenerationDefaultsPicker } from './StoryGenerationDefaultsPicker'
import { StudioSceneSectionPanel } from './StudioSceneSectionPanel'
import { StudioSceneSectionPlaceholder } from './StudioSceneSectionPlaceholder'
import { StoryReadingWorkspace } from './StoryReadingWorkspace'
import { StudioSectionErrorBoundary } from './StudioSectionErrorBoundary'
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
  scriptReviewMode?: boolean
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
  onScriptReviewNextScene?: (sceneIndex: number) => void
  patchProject?: (fn: (p: ProjectState) => ProjectState) => void
  onSmartRegen?: (sceneIndex: number, action: SmartRegenAction) => void
  onRegenerateMissingSceneImages?: () => void
  onGenerateFinalVideo?: () => void
  onApproveSceneImages?: () => void
  onRetryFailedScenes?: (sceneIndices?: number[]) => void
  onRetrySceneImage?: (sceneIndex: number) => void
}

function TabPanel({
  tabId,
  active,
  sectionLabel,
  className,
  children
}: {
  tabId: StudioScriptTab
  active: boolean
  sectionLabel: string
  className?: string
  children: ReactNode
}) {
  return (
    <div
      id={`studio-tab-panel-${tabId}`}
      className={`studio-script-workspace__panel${className ? ` ${className}` : ''}${active ? '' : ' studio-script-workspace__panel--hidden'}`}
      role="tabpanel"
      aria-labelledby={`studio-tab-${tabId}`}
      hidden={!active}
      aria-hidden={!active}
    >
      <StudioSectionErrorBoundary section={sectionLabel} onResetKey={active ? 1 : 0}>
        {children}
      </StudioSectionErrorBoundary>
    </div>
  )
}

export function StudioScriptWorkspaceTabs({
  project,
  episode,
  storyGenerated,
  scriptReviewMode = false,
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
  onScriptReviewNextScene,
  patchProject,
  onSmartRegen,
  onRegenerateMissingSceneImages,
  onGenerateFinalVideo,
  onApproveSceneImages,
  onRetryFailedScenes,
  onRetrySceneImage
}: Props) {
  const uiText = useUiText()
  const [tab, setTab] = useState<StudioScriptTab>(storyGenerated ? 'scenes' : 'script')

  useEffect(() => {
    if (scriptReviewMode) setTab('script')
  }, [scriptReviewMode, project?.id])

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

  const safeScenes = Array.isArray(scenes) ? scenes : []
  const activeIx = activeSceneIndex ?? safeScenes[0]?.index ?? 1

  return (
    <div className="studio-script-workspace">
      <div className="studio-script-workspace__tabs" role="tablist" aria-label={uiText('studioScriptWorkspaceAria')}>
        {tabs.map((t) => (
          <button
            key={t.id}
            id={`studio-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`studio-tab-panel-${t.id}`}
            className={`studio-script-workspace__tab${tab === t.id ? ' studio-script-workspace__tab--on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="studio-script-workspace__body">
        <TabPanel tabId="scenes" active={tab === 'scenes'} sectionLabel={uiText('studioTabScenes')}>
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
        </TabPanel>

        <TabPanel tabId="script" active={tab === 'script'} sectionLabel={uiText('studioTabScript')}>
          {scriptReviewMode && project && episode && patchProject ? (
            <ScriptReviewWorkspace
              project={project}
              episode={episode}
              busyLabel={busyLabel}
              embeddedInScriptPanel
              onNextScene={(sceneIndex) => onScriptReviewNextScene?.(sceneIndex)}
              patchProject={patchProject}
            />
          ) : (
            <LiveScriptPreview
              scenes={safeScenes}
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
          )}
        </TabPanel>

        <TabPanel
          tabId="voice"
          active={tab === 'voice'}
          sectionLabel={uiText('studioTabVoice')}
          className="studio-script-workspace__voice"
        >
          <StoryGenerationDefaultsPicker embeddedInGeneratedDialog />
        </TabPanel>

        <TabPanel tabId="story" active={tab === 'story'} sectionLabel={uiText('studioTabStory')}>
          {storyGenerated ? (
            <StoryReadingWorkspace project={project} episode={episode} />
          ) : (
            <div className="story-reading-workspace story-reading-workspace--empty">
              <p className="story-reading-workspace__empty">{uiText('storyReadingEmpty')}</p>
            </div>
          )}
        </TabPanel>

        <TabPanel
          tabId="video"
          active={tab === 'video'}
          sectionLabel={uiText('studioTabVideo')}
          className="studio-script-workspace__voice"
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
        </TabPanel>
      </div>
    </div>
  )
}
