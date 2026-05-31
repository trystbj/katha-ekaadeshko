import { useMemo } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import type { ProjectState, StoryEpisode } from '../types/story'
import { scenePlanAt } from '../cinematic/environmentCss'
import type { CinematicDirectorPlan } from '../../../../core/cinematic/types'
import { SceneAiDirectorStrip } from './SceneAiDirectorStrip'
import { StoryHealthStrip } from './StoryHealthStrip'
import { episodeSceneImageCoverage } from '../utils/storyboardWorkflow'

type Props = {
  project: ProjectState
  episode: StoryEpisode
  activeSceneIndex: number
  busyLabel: string | null
  onApproveSceneImages?: () => void
}

/** Scene column — AI Director + single batch image generation control. */
export function StudioSceneSectionPanel({
  project,
  episode,
  activeSceneIndex,
  busyLabel,
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

  const castSummary = useMemo(() => {
    const mem = project.characterIdentityMemory ?? []
    if (!mem.length) return null
    return mem.map((m) => `${m.label} (${m.gender})`).join(' · ')
  }, [project.characterIdentityMemory])

  const needsBatch = !project.assetsGenerationApproved || coverage.missing.length > 0

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
        {onApproveSceneImages && needsBatch ? (
          <button
            type="button"
            className="btn btn-generate-cta studio-scene-section__batch-btn"
            disabled={generating || rendering || regenBusy}
            onClick={onApproveSceneImages}
          >
            {regenBusy || generating
              ? uiText('storyboardRegeneratingImages')
              : uiText('studioSceneGenerateAllImages')}
          </button>
        ) : null}
      </div>
      {needsBatch && coverage.missing.length > 0 ? (
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
