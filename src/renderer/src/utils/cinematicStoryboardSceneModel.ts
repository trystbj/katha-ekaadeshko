import type { CinematicDirectorPlan, CinematicScenePlan } from '../../../../core/cinematic/types'
import type { ProjectState, StoryEpisode, StoryScene } from '../types/story'
import { scenePlanAt } from '../cinematic/environmentCss'
import { buildUnifiedSceneState } from './unifiedSceneState'
import type { SceneImageStatus } from './sceneImageStatus'
import { SECONDS_PER_RENDER_SCENE } from './scenesWebVtt'
import {
  cinematicTagI18nKey,
  inferCinematicSceneTags,
  motionIndicatorLabel,
  transitionHintFromPlan,
  type CinematicSceneTagId
} from './cinematicSceneTags'
import { ensureVideoStudio } from './ensureVideoStudio'

export type SceneTileStatusId =
  | 'generated'
  | 'rendering'
  | 'narration_synced'
  | 'subtitle_synced'
  | 'export_ready'
  | 'rendered'

export type CinematicStoryboardTileModel = {
  rowIndex: number
  scene: StoryScene
  imageUrl: string | undefined
  imageStatus: SceneImageStatus
  plan: CinematicScenePlan | null
  tags: CinematicSceneTagId[]
  tagKeys: string[]
  durationSec: number
  motionKey: string
  transitionKey: string
  moodKey: string
  statuses: SceneTileStatusId[]
  castLabels: string[]
}

export function buildStoryboardTileModels(opts: {
  project: ProjectState
  episode: StoryEpisode
  cinematicPlan?: CinematicDirectorPlan | Record<string, unknown> | null
  busyLabel: string | null
  narratorLabel: string
}): CinematicStoryboardTileModel[] {
  const { project, episode, cinematicPlan, busyLabel, narratorLabel } = opts
  const plan = cinematicPlan as CinematicDirectorPlan | null | undefined
  const vs = ensureVideoStudio(project)
  const hasNarration = Boolean(episode.narrationAudioUrl?.trim())
  const videoReady = Boolean(project.lastRenderVideoUrl)
  const rendering = busyLabel === 'rendering'
  const pipelineExportReady =
    project.pipelineValidationReport?.episodeNumber === episode.number
      ? project.pipelineValidationReport.exportReady
      : false
  const cast = (project.characterIdentityMemory ?? []).map((m) => m.label).slice(0, 4)

  const orch = plan?.orchestration as
    | {
        emotionProfiles?: Array<Record<string, unknown>>
        premiumStudio?: { shortForm?: { hookSceneIndices?: number[] } }
      }
    | undefined
  const emotionProfiles = orch?.emotionProfiles
  const hookSceneIndices = orch?.premiumStudio?.shortForm?.hookSceneIndices

  return episode.scenes.map((scene, rowIndex) => {
    const unified = buildUnifiedSceneState(project, episode, scene)
    const planRow = scenePlanAt(plan, rowIndex)
    const emotionProfile = emotionProfiles?.[rowIndex] as
      | { romance?: number; dramaticIntensity?: number; suspense?: number }
      | undefined
    const tags = inferCinematicSceneTags(scene, planRow, emotionProfile, {
      hookSceneIndices,
      sceneIndex: scene.index
    })
    const statuses: SceneTileStatusId[] = []
    const imageUrl = unified.displayImageUrl
    const imageStatus = unified.imageStatus
    if (imageStatus === 'completed') statuses.push('generated')
    if (rendering && imageStatus === 'generating') statuses.push('rendering')
    if (hasNarration) statuses.push('narration_synced')
    if (vs.subtitleStudio.subtitlesOn) statuses.push('subtitle_synced')
    if (pipelineExportReady && unified.exportReady) statuses.push('export_ready')
    if (videoReady) statuses.push('rendered')

    const durationSec =
      planRow && 'durationMs' in (planRow as { durationMs?: number })
        ? Math.max(1, Math.round(((planRow as { durationMs?: number }).durationMs ?? 0) / 1000))
        : SECONDS_PER_RENDER_SCENE

    return {
      rowIndex,
      scene,
      imageUrl,
      imageStatus,
      plan: planRow,
      tags,
      tagKeys: tags.map(cinematicTagI18nKey),
      durationSec,
      motionKey: motionIndicatorLabel(planRow?.motion?.preset),
      transitionKey: transitionHintFromPlan(planRow),
      moodKey: planRow?.emotion ? `cineMood_${planRow.emotion}` : 'cineMood_neutral',
      statuses,
      castLabels: cast
    }
  })
}
