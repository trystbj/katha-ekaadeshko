import { useMemo } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import type { ProjectState, StoryEpisode } from '../types/story'
import { scenePlanAt } from '../cinematic/environmentCss'
import type { CinematicDirectorPlan } from '../../../../core/cinematic/types'
import { SceneAiDirectorStrip } from './SceneAiDirectorStrip'
import { StoryHealthStrip } from './StoryHealthStrip'
import { SmartSceneRegenMenu, type SmartRegenAction } from './SmartSceneRegenMenu'
import { episodeSceneImageCoverage } from '../utils/storyboardWorkflow'
import { deriveCinematicProductionGate } from '../utils/cinematicProductionGate'

type Props = {
  project: ProjectState
  episode: StoryEpisode
  activeSceneIndex: number
  busyLabel: string | null
  onSmartRegen?: (sceneIndex: number, action: SmartRegenAction) => void
  onRegenerateMissingSceneImages?: () => void
  onGenerateFinalVideo?: () => void
  onApproveSceneImages?: () => void
}

/** Scene column after story generation — AI Director and scene tools only (no scene list). */
export function StudioSceneSectionPanel({
  project,
  episode,
  activeSceneIndex,
  busyLabel,
  onSmartRegen,
  onRegenerateMissingSceneImages,
  onGenerateFinalVideo,
  onApproveSceneImages
}: Props) {
  const uiText = useUiText()
  const generating = busyLabel === 'generating'
  const rendering = busyLabel === 'rendering'
  const regenBusy = busyLabel === 'leonardo'

  const activeScene = episode.scenes.find((s) => s.index === activeSceneIndex) ?? episode.scenes[0]
  const cinematicPlan = episode.cinematicDirectorPlan as CinematicDirectorPlan | null | undefined
  const rowIx = episode.scenes.findIndex((s) => s.index === activeScene?.index)
  const scenePlan = scenePlanAt(cinematicPlan, rowIx >= 0 ? rowIx : 0)

  const coverage = useMemo(
    () => episodeSceneImageCoverage(project, episode.number),
    [project, episode.number]
  )
  const productionGate = useMemo(
    () => deriveCinematicProductionGate(project, episode.number),
    [project, episode.number]
  )

  const castSummary = useMemo(() => {
    const mem = project.characterIdentityMemory ?? []
    if (!mem.length) return null
    return mem.map((m) => `${m.label} (${m.gender})`).join(' · ')
  }, [project.characterIdentityMemory])

  if (!activeScene) {
    return <p className="studio-scene-section__empty">{uiText('studioSceneSectionEmpty')}</p>
  }

  return (
    <div className="studio-scene-section">
      <p className="studio-scene-section__lead">{uiText('studioSceneSectionLead')}</p>
      <StoryHealthStrip project={project} episode={episode} />
      <SceneAiDirectorStrip scene={activeScene} plan={scenePlan} />
      {castSummary ? (
        <p className="studio-scene-section__cast" title={castSummary}>
          {uiText('storyboardCastLock')}: {castSummary}
        </p>
      ) : null}
      <div className="studio-scene-section__tools">
        {onSmartRegen ? (
          <SmartSceneRegenMenu
            disabled={Boolean(busyLabel)}
            onAction={(action) => onSmartRegen(activeScene.index, action)}
          />
        ) : null}
        {onApproveSceneImages && !project.assetsGenerationApproved ? (
          <button
            type="button"
            className="btn btn-ghost btn-small"
            disabled={generating || rendering}
            onClick={onApproveSceneImages}
          >
            {uiText('studioSceneApproveImages')}
          </button>
        ) : null}
        {coverage.missing.length > 0 && onRegenerateMissingSceneImages ? (
          <button
            type="button"
            className="btn btn-ghost btn-small"
            disabled={regenBusy || rendering}
            onClick={onRegenerateMissingSceneImages}
          >
            {regenBusy ? uiText('storyboardRegeneratingImages') : uiText('storyboardRegenerateMissingImages')}
          </button>
        ) : null}
        {onGenerateFinalVideo ? (
          <button
            type="button"
            className="btn btn-generate-cta btn-small studio-scene-section__render-btn"
            disabled={rendering || regenBusy || generating || !productionGate.canRenderFinalVideo}
            title={!productionGate.canRenderFinalVideo ? uiText('storyboardVideoDisabledHint') : undefined}
            onClick={onGenerateFinalVideo}
          >
            {rendering ? uiText('storyboardRendering') : uiText('storyboardGenerateFinalVideo')}
          </button>
        ) : null}
      </div>
      {coverage.missing.length > 0 ? (
        <p className="studio-scene-section__hint" role="status">
          {uiText('storyboardMissingImages', {
            count: String(coverage.missing.length),
            scenes: coverage.missing.join(', ')
          })}
        </p>
      ) : null}
      <p className="studio-scene-section__monitor-note">{uiText('studioSceneSectionMonitorNote')}</p>
    </div>
  )
}
