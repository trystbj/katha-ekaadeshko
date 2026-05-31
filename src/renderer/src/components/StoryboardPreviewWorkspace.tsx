import { useCallback, useRef } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import type { ProjectState, StoryEpisode, StoryScene } from '../types/story'
import type { StudioSeasonId } from '../constants/studioSeasonThemes'
import { PreviewStage } from './PreviewStage'
import { StoryboardSubtitleLiveOverlay } from './StoryboardSubtitleLiveOverlay'
import { ensureVideoStudio } from '../utils/ensureVideoStudio'
import { sceneUrlForIndex } from '../utils/sceneAssetMap'
import { useStudioStore } from '../store/useStudioStore'
import { normalizeSubtitleStudio } from '../types/subtitleStudio'
import { StoryboardSubtitleToolbar } from './StoryboardSubtitleToolbar'
import type { SubtitleFreePosition } from '../utils/subtitleFreePosition'
import { isSubtitlePlaybackPresetId } from '../constants/subtitlePlaybackPresets'

type Props = {
  project: ProjectState
  episode: StoryEpisode
  seasonId: StudioSeasonId
  sceneUrls: string[]
  heroUrl: string | null
  carouselIndex: number
  onCarouselIndexChange: (index: number) => void
  busyLabel: string | null
  jobProgress?: number
  celebrateComplete?: boolean
  celebrateTitleKey?: string
  patchProject: (fn: (p: ProjectState) => ProjectState) => void
  hideCastOverlays?: boolean
}

/** Main display — full-frame preview; scene list lives in Story Monitor only. */
export function StoryboardPreviewWorkspace({
  project,
  episode,
  seasonId,
  sceneUrls,
  heroUrl,
  carouselIndex,
  onCarouselIndexChange,
  busyLabel,
  jobProgress,
  celebrateComplete,
  celebrateTitleKey = 'previewCelebrateStoryboard',
  patchProject,
  hideCastOverlays = false
}: Props) {
  const uiText = useUiText()
  const stageWrapRef = useRef<HTMLDivElement>(null)
  const vs = ensureVideoStudio(project)
  const studio = vs.subtitleStudio

  const sceneCount = episode.scenes.length
  const safeIx = sceneCount ? Math.min(Math.max(0, carouselIndex), sceneCount - 1) : 0
  const activeScene: StoryScene | undefined = episode.scenes[safeIx]
  const activeSceneUrl = activeScene ? sceneUrlForIndex(project, activeScene.index) || sceneUrls[safeIx] : ''

  const patchSubtitle = useCallback(
    (partial: Parameters<typeof normalizeSubtitleStudio>[0]) => {
      patchProject((p) => {
        const base = ensureVideoStudio(p)
        const nextStudio = normalizeSubtitleStudio({ ...base.subtitleStudio, ...partial })
        const z = useStudioStore.getState()
        z.setPlaybackSubtitlesOn(nextStudio.subtitlesOn)
        if (isSubtitlePlaybackPresetId(nextStudio.playbackPresetId)) {
          z.setSubtitlePlaybackPresetId(nextStudio.playbackPresetId)
        }
        return {
          ...p,
          updatedAt: new Date().toISOString(),
          videoStudio: { ...base, subtitleStudio: nextStudio }
        }
      })
    },
    [patchProject]
  )

  const onSubtitlePositionChange = useCallback(
    (pos: SubtitleFreePosition) => {
      patchSubtitle({ positionXPct: pos.positionXPct, positionYPct: pos.positionYPct })
    },
    [patchSubtitle]
  )

  const generating = busyLabel === 'generating'
  const rendering = busyLabel === 'rendering'

  return (
    <div className="storyboard-workspace storyboard-workspace--preview-focus studio-mock-preview-wrap workspace-premium__stage">
      <div className="storyboard-workspace__stage-wrap" ref={stageWrapRef}>
        <PreviewStage
          sectionClassName="storyboard-workspace__preview-stage preview-stage--maximize"
          seasonId={seasonId}
          sceneUrls={sceneUrls}
          heroUrl={heroUrl || activeSceneUrl || null}
          carouselIndex={carouselIndex}
          onCarouselIndexChange={onCarouselIndexChange}
          busy={generating}
          jobProgress={jobProgress}
          celebrateComplete={celebrateComplete}
          celebrateTitleKey={celebrateTitleKey}
          pipelineThumbUrls={[]}
          hideIdleThumbStrip
          hideSceneCaption
          castPortraits={[]}
          hideCastLayer
          showSceneNav={sceneCount > 1}
          sceneCount={sceneCount}
          hideHeading
          idleBlank={!activeSceneUrl && !heroUrl}
          useWireframeExplanation={!sceneUrls.some(Boolean) && !heroUrl}
        />
        <StoryboardSubtitleLiveOverlay
          scene={activeScene}
          studio={studio}
          visible={!rendering}
          containerRef={stageWrapRef}
          onPositionChange={onSubtitlePositionChange}
          onScaleChange={(fontSizePct) =>
            patchSubtitle({ advanced: { ...studio.advanced, fontSizePct } })
          }
        />
      </div>

      <details className="storyboard-workspace__cc-drawer">
        <summary>{uiText('storyboardCcDrawer')}</summary>
        <StoryboardSubtitleToolbar
          studio={studio}
          disabled={rendering}
          onPatch={patchSubtitle}
        />
      </details>

      {celebrateComplete ? (
        <p className="storyboard-workspace__celebrate-caption" role="status">
          {uiText(celebrateTitleKey)}
        </p>
      ) : null}
    </div>
  )
}
