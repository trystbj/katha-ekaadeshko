import { useMemo } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import type { ProjectState, StoryEpisode } from '../types/story'
import { scenePlanAt } from '../cinematic/environmentCss'
import type { CinematicDirectorPlan } from '../../../../core/cinematic/types'
import { SceneAiDirectorStrip } from './SceneAiDirectorStrip'
import { StoryHealthStrip } from './StoryHealthStrip'
import {
  countCompletedSceneImages,
  getScenesNeedingImageRegeneration
} from '../utils/sceneImageStatus'
import { VisualGenerationDiagnosticsPanel } from './VisualGenerationDiagnosticsPanel'
import { PipelineDebugPanel } from './PipelineDebugPanel'
import { useStudioStore } from '../store/useStudioStore'
import { SceneGenerationDiagnosticsStrip } from './SceneGenerationDiagnosticsStrip'
import '../styles/pipeline-debug-panel.css'

type Props = {
  project: ProjectState
  episode: StoryEpisode
  activeSceneIndex: number
  busyLabel: string | null
  onApproveSceneImages?: () => void
  onRetryFailedScenes?: (sceneIndices?: number[]) => void
  onRetrySceneImage?: (sceneIndex: number) => void
}

function safeScenes(episode: StoryEpisode | null | undefined) {
  if (!episode || !Array.isArray(episode.scenes)) return []
  return episode.scenes.filter(Boolean)
}

/** Scene column — AI Director + single batch image generation control. */
export function StudioSceneSectionPanel({
  project,
  episode,
  activeSceneIndex,
  busyLabel,
  onApproveSceneImages,
  onRetryFailedScenes,
  onRetrySceneImage
}: Props) {
  const uiText = useUiText()
  const lastError = useStudioStore((s) => s.error)
  const visualDiagnostics = useStudioStore((s) => s.visualDiagnostics)
  const healSummary = useStudioStore.getState().visualGenerationSummary
  const generating = busyLabel === 'generating'
  const rendering = busyLabel === 'rendering'
  const regenBusy = busyLabel === 'leonardo'

  const scenes = useMemo(() => safeScenes(episode), [episode])
  const activeScene =
    scenes.find((s) => s.index === activeSceneIndex) ?? scenes[0] ?? null
  const cinematicPlan = episode?.cinematicDirectorPlan as CinematicDirectorPlan | null | undefined
  const rowIx = activeScene ? scenes.findIndex((s) => s.index === activeScene.index) : 0
  const scenePlan = scenePlanAt(cinematicPlan, rowIx >= 0 ? rowIx : 0)

  const imageCounts = useMemo(
    () => countCompletedSceneImages(project, episode?.number ?? 1),
    [project, episode?.number, project.updatedAt, project.pipelineValidationReport]
  )
  const scenesNeedingImages = useMemo(
    () => getScenesNeedingImageRegeneration(project, episode?.number ?? 1),
    [project, episode?.number, project.updatedAt, project.pipelineValidationReport]
  )

  const castSummary = useMemo(() => {
    const mem = project?.characterIdentityMemory ?? []
    if (!mem.length) return null
    return mem
      .map((m) => {
        const g =
          m.gender && String(m.gender).toLowerCase() !== 'unknown' ? m.gender : 'neutral'
        return `${m.label} (${g})`
      })
      .join(' · ')
  }, [project?.characterIdentityMemory])

  if (!project?.bible) {
    return <p className="studio-scene-section__empty">{uiText('storyReadingFinishFirst')}</p>
  }

  if (!scenes.length) {
    return <p className="studio-scene-section__empty">{uiText('studioScenesNotGenerated')}</p>
  }

  const animationReady =
    project.pipelineValidationReport?.animationReady ??
    healSummary?.storyReadyForAnimation ??
    false
  const needsBatch = imageCounts.total > 0 && !animationReady
  const batchBusy = generating || regenBusy

  if (!activeScene) {
    return <p className="studio-scene-section__empty">{uiText('studioScenesNotGenerated')}</p>
  }

  return (
    <div className="studio-scene-section">
      <p className="studio-scene-section__lead">{uiText('studioSceneSectionLead')}</p>
      <StoryHealthStrip project={project} episode={{ ...episode, scenes }} />
      <SceneAiDirectorStrip scene={activeScene} plan={scenePlan} />
      {castSummary ? (
        <p className="studio-scene-section__cast" title={castSummary}>
          {uiText('storyboardCastLock')}: {castSummary}
        </p>
      ) : null}
      <div className="studio-scene-section__tools">
        {onApproveSceneImages && needsBatch ? (
          <button
            type="button"
            className="btn btn-generate-cta studio-scene-section__batch-btn"
            disabled={batchBusy || rendering}
            onClick={onApproveSceneImages}
          >
            {batchBusy
              ? uiText('storyboardRegeneratingImages')
              : uiText('studioSceneGenerateAllImages')}
          </button>
        ) : null}
        {!needsBatch && imageCounts.total > 0 ? (
          <div className="studio-scene-section__complete" role="status">
            {healSummary ? (
              <>
                <p>
                  {uiText('visualGenImagesCount', {
                    generated: String(imageCounts.completed),
                    total: String(imageCounts.total)
                  })}
                </p>
                {healSummary.missingRepaired > 0 ? (
                  <p>
                    {uiText('visualGenMissingRepaired', {
                      count: String(healSummary.missingRepaired)
                    })}
                  </p>
                ) : null}
                {healSummary.blackRepaired > 0 ? (
                  <p>
                    {uiText('visualGenBlackRepaired', { count: String(healSummary.blackRepaired) })}
                  </p>
                ) : null}
                {animationReady ? (
                  <p className="studio-scene-section__ready">{uiText('visualGenStoryReadyAnimation')}</p>
                ) : (
                  <p>{uiText('studioScenesGenerateImages')}</p>
                )}
              </>
            ) : (
              <p>{uiText('studioSceneImagesComplete')}</p>
            )}
          </div>
        ) : null}
        {imageCounts.total > 0 && imageCounts.completed === 0 && !needsBatch ? (
          <p className="studio-scene-section__hint">{uiText('studioScenesGenerateImages')}</p>
        ) : null}
      </div>
      {scenesNeedingImages.length > 0 ? (
        <p className="studio-scene-section__hint" role="status">
          {uiText('storyboardMissingImages', {
            count: String(scenesNeedingImages.length),
            scenes: scenesNeedingImages.join(', ')
          })}
        </p>
      ) : null}
      {scenesNeedingImages.length > 0 && onRetryFailedScenes ? (
        <button
          type="button"
          className="btn studio-scene-section__retry-btn"
          disabled={batchBusy || rendering}
          onClick={() => onRetryFailedScenes(scenesNeedingImages)}
        >
          {uiText('visualRetryFailedScenes')}
        </button>
      ) : null}
      <SceneGenerationDiagnosticsStrip
        project={project}
        episode={{ ...episode, scenes }}
        lastError={lastError}
      />
      <PipelineDebugPanel
        project={project}
        episode={{ ...episode, scenes }}
        cachedReport={project.pipelineValidationReport ?? undefined}
        onRetryScene={
          onRetrySceneImage
            ? (sceneIndex) => onRetrySceneImage(sceneIndex)
            : onRetryFailedScenes
              ? (sceneIndex) => onRetryFailedScenes([sceneIndex])
              : undefined
        }
      />
      <VisualGenerationDiagnosticsPanel rows={visualDiagnostics ?? []} visible={Boolean(visualDiagnostics?.length)} />
      <p className="studio-scene-section__monitor-note">{uiText('studioSceneSectionMonitorNote')}</p>
    </div>
  )
}
