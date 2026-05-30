import { useCallback, useMemo, useRef } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import type { ProjectState, StoryEpisode, StoryScene } from '../types/story'
import type { StudioSeasonId } from '../constants/studioSeasonThemes'
import { PreviewStage } from './PreviewStage'
import { StoryboardSubtitleLiveOverlay } from './StoryboardSubtitleLiveOverlay'
import { ensureVideoStudio } from '../utils/ensureVideoStudio'
import { sceneUrlForIndex } from '../utils/sceneAssetMap'
import { episodeSceneImageCoverage } from '../utils/storyboardWorkflow'
import { useStudioStore } from '../store/useStudioStore'
import { normalizeSubtitleStudio } from '../types/subtitleStudio'
import { StoryboardSubtitleToolbar } from './StoryboardSubtitleToolbar'
import type { SubtitleFreePosition } from '../utils/subtitleFreePosition'
import { deriveCinematicProductionGate, sceneImageStateForIndex } from '../utils/cinematicProductionGate'

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
  onGenerateFinalVideo: () => void
  onRegenerateMissingSceneImages?: () => void
  onGenerateVisuals?: (opts?: { sceneIndices?: number[] }) => void
  patchProject: (fn: (p: ProjectState) => ProjectState) => void
}

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
  onGenerateFinalVideo,
  onRegenerateMissingSceneImages,
  onGenerateVisuals,
  patchProject
}: Props) {
  const uiText = useUiText()
  const stageWrapRef = useRef<HTMLDivElement>(null)
  const vs = ensureVideoStudio(project)
  const studio = vs.subtitleStudio

  const sceneCount = episode.scenes.length
  const safeIx = sceneCount ? Math.min(Math.max(0, carouselIndex), sceneCount - 1) : 0
  const activeScene: StoryScene | undefined = episode.scenes[safeIx]
  const activeSceneUrl = activeScene ? sceneUrlForIndex(project, activeScene.index) || sceneUrls[safeIx] : ''

  const castSummary = useMemo(() => {
    const mem = project.characterIdentityMemory ?? []
    if (!mem.length) return null
    return mem.map((m) => `${m.label} (${m.gender})`).join(' · ')
  }, [project.characterIdentityMemory])

  const castPortraits = useMemo(
    () =>
      (project?.bible?.characters ?? [])
        .filter((c) => c.baseImageUrl)
        .slice(0, 4)
        .map((c) => ({ name: c.name, url: String(c.baseImageUrl), role: c.role })),
    [project?.bible?.characters]
  )

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
        console.info('[katha:preview]', 'subtitle_studio_patch', {
          subtitlesOn: nextStudio.subtitlesOn,
          preset: nextStudio.playbackPresetId
        })
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
  const regenBusy = busyLabel === 'leonardo'
  const coverage = useMemo(
    () => episodeSceneImageCoverage(project, episode.number),
    [project, episode.number]
  )
  const productionGate = useMemo(
    () => deriveCinematicProductionGate(project, episode.number),
    [project, episode.number]
  )
  const allSceneImagesReady = productionGate.canRenderFinalVideo

  return (
    <div className="storyboard-workspace studio-mock-preview-wrap workspace-premium__stage">
      <div className="storyboard-workspace__stage-wrap" ref={stageWrapRef}>
        <PreviewStage
          sectionClassName="storyboard-workspace__preview-stage"
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
          castPortraits={castPortraits}
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
        />
      </div>

      <div className="storyboard-workspace__dock">
        <p className="storyboard-workspace__hint">{uiText('storyboardModeHint')}</p>

        {castSummary ? (
          <p className="storyboard-workspace__cast" title={castSummary}>
            {uiText('storyboardCastLock')}: {castSummary}
          </p>
        ) : null}

        <StoryboardSubtitleToolbar
          studio={studio}
          disabled={rendering}
          onPatch={patchSubtitle}
        />

        <div className="storyboard-workspace__timeline" role="list" aria-label={uiText('storyboardTimeline')}>
          {episode.scenes.map((sc, i) => {
            const url = sceneUrlForIndex(project, sc.index) || sceneUrls[i]
            const on = i === safeIx
            const imgState = sceneImageStateForIndex(project, sc.index, generating)
            return (
              <button
                key={sc.index}
                type="button"
                role="listitem"
                className={`storyboard-workspace__tl-chip storyboard-workspace__tl-chip--${imgState}${on ? ' storyboard-workspace__tl-chip--on' : ''}`}
                style={url ? { backgroundImage: `url(${url})` } : undefined}
                onClick={() => {
                  console.info('[katha:scene-map]', 'timeline_select', { sceneIndex: sc.index, row: i })
                  onCarouselIndexChange(i)
                }}
                title={sc.text.slice(0, 120)}
              >
                <span className="storyboard-workspace__tl-num">{sc.index}</span>
              </button>
            )
          })}
        </div>


        {coverage.missing.length > 0 ? (
          <p className="storyboard-workspace__missing-hint" role="status">
            {uiText('storyboardMissingImages', {
              count: String(coverage.missing.length),
              scenes: coverage.missing.join(', ')
            })}
          </p>
        ) : null}

        {coverage.missing.length > 0 && onRegenerateMissingSceneImages ? (
          <button
            type="button"
            className="btn btn-ghost storyboard-workspace__regen-btn"
            disabled={regenBusy || rendering}
            onClick={() => {
              console.info('[katha:leonardo]', 'regenerate_missing_scenes', {
                missing: coverage.missing
              })
              onRegenerateMissingSceneImages()
            }}
          >
            {regenBusy ? uiText('storyboardRegeneratingImages') : uiText('storyboardRegenerateMissingImages')}
          </button>
        ) : null}

        <button
          type="button"
          className="btn btn-generate-cta storyboard-workspace__render-btn"
          disabled={rendering || regenBusy || generating || !allSceneImagesReady}
          title={!allSceneImagesReady ? uiText('storyboardVideoDisabledHint') : undefined}
          onClick={() => {
            console.info('[katha:render]', 'manual_final_video_requested', { projectId: project.id })
            onGenerateFinalVideo()
          }}
        >
          {rendering ? uiText('storyboardRendering') : uiText('storyboardGenerateFinalVideo')}
        </button>
      </div>

      {celebrateComplete ? (
        <p className="storyboard-workspace__celebrate-caption" role="status">
          {uiText(celebrateTitleKey)}
        </p>
      ) : null}
    </div>
  )
}
