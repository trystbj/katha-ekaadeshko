import { useCallback, useMemo } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import type { ProjectState, StoryEpisode, StoryScene } from '../types/story'
import type { StudioSeasonId } from '../constants/studioSeasonThemes'
import { PreviewStage } from './PreviewStage'
import { StoryboardSubtitleLiveOverlay } from './StoryboardSubtitleLiveOverlay'
import { ensureVideoStudio } from '../utils/ensureVideoStudio'
import { sceneUrlForIndex } from '../utils/sceneAssetMap'
import { episodeSceneImageCoverage } from '../utils/storyboardWorkflow'
import {
  SUBTITLE_PLAYBACK_PRESETS,
  SUBTITLE_PLAYBACK_PRESET_ORDER,
  isSubtitlePlaybackPresetId,
  type SubtitlePlaybackPresetId
} from '../constants/subtitlePlaybackPresets'
import { useStudioStore } from '../store/useStudioStore'
import { normalizeSubtitleStudio } from '../types/subtitleStudio'

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
  patchProject
}: Props) {
  const uiText = useUiText()
  const vs = ensureVideoStudio(project)
  const studio = vs.subtitleStudio

  const safeIx = sceneUrls.length
    ? Math.min(Math.max(0, carouselIndex), sceneUrls.length - 1)
    : 0
  const activeScene: StoryScene | undefined = episode.scenes[safeIx] ?? episode.scenes.find((s) => s.index === safeIx + 1)

  const castSummary = useMemo(() => {
    const mem = project.characterIdentityMemory ?? []
    if (!mem.length) return null
    return mem.map((m) => `${m.label} (${m.gender})`).join(' · ')
  }, [project.characterIdentityMemory])

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

  const setPreset = (id: SubtitlePlaybackPresetId) => {
    patchSubtitle({ playbackPresetId: id })
  }

  const generating = busyLabel === 'generating'
  const rendering = busyLabel === 'rendering'
  const regenBusy = busyLabel === 'leonardo'
  const coverage = useMemo(
    () => episodeSceneImageCoverage(project, episode.number),
    [project, episode.number]
  )
  const allSceneImagesReady = coverage.total > 0 && coverage.missing.length === 0

  return (
    <div className="storyboard-workspace studio-mock-preview-wrap workspace-premium__stage">
      <div className="storyboard-workspace__stage-wrap">
        <PreviewStage
          sectionClassName="storyboard-workspace__preview-stage"
          seasonId={seasonId}
          sceneUrls={sceneUrls}
          heroUrl={heroUrl}
          carouselIndex={carouselIndex}
          onCarouselIndexChange={onCarouselIndexChange}
          busy={generating}
          jobProgress={jobProgress}
          celebrateComplete={celebrateComplete}
          celebrateTitleKey={celebrateTitleKey}
          pipelineThumbUrls={sceneUrls}
          hideHeading
          idleBlank
          useWireframeExplanation={!sceneUrls.length}
        />
        <StoryboardSubtitleLiveOverlay scene={activeScene} studio={studio} visible={!rendering} />
      </div>

      <div className="storyboard-workspace__dock">
        <p className="storyboard-workspace__hint">{uiText('storyboardModeHint')}</p>

        {castSummary ? (
          <p className="storyboard-workspace__cast" title={castSummary}>
            {uiText('storyboardCastLock')}: {castSummary}
          </p>
        ) : null}

        <div className="storyboard-workspace__subtitle-row">
          <label className="storyboard-workspace__sub-toggle">
            <input
              type="checkbox"
              checked={studio.subtitlesOn}
              onChange={(e) => patchSubtitle({ subtitlesOn: e.target.checked })}
            />
            {studio.subtitlesOn ? uiText('storyboardSubtitlesOn') : uiText('storyboardSubtitlesOff')}
          </label>
          <select
            className="select storyboard-workspace__preset-select"
            value={studio.playbackPresetId}
            disabled={!studio.subtitlesOn}
            onChange={(e) => {
              const v = e.target.value
              if (isSubtitlePlaybackPresetId(v)) setPreset(v)
            }}
            aria-label={uiText('storyboardSubtitleStyle')}
          >
            {SUBTITLE_PLAYBACK_PRESET_ORDER.map((id) => (
              <option key={id} value={id}>
                {uiText(SUBTITLE_PLAYBACK_PRESETS[id].labelKey)}
              </option>
            ))}
          </select>
          <label className="storyboard-workspace__size-label">
            <span>{uiText('storyboardSubtitleSize')}</span>
            <input
              type="range"
              min={70}
              max={160}
              value={studio.advanced.fontSizePct}
              disabled={!studio.subtitlesOn}
              onChange={(e) =>
                patchSubtitle({
                  advanced: { ...studio.advanced, fontSizePct: Number(e.target.value) }
                })
              }
            />
          </label>
          <label className="storyboard-workspace__color-label">
            <span>{uiText('storyboardSubtitleColor')}</span>
            <input
              type="color"
              value={studio.advanced.textColor}
              disabled={!studio.subtitlesOn}
              onChange={(e) =>
                patchSubtitle({
                  advanced: { ...studio.advanced, textColor: e.target.value }
                })
              }
            />
          </label>
          <select
            className="select storyboard-workspace__position-select"
            value={studio.positionPreset}
            disabled={!studio.subtitlesOn}
            onChange={(e) =>
              patchSubtitle({
                positionPreset: e.target.value as SubtitleStudioState['positionPreset']
              })
            }
            aria-label={uiText('storyboardSubtitlePosition')}
          >
            <option value="bottom_center">{uiText('storyboardSubPosBottom')}</option>
            <option value="floating_adaptive">{uiText('storyboardSubPosLowerThird')}</option>
            <option value="center">{uiText('storyboardSubPosMiddle')}</option>
            <option value="top_center">{uiText('storyboardSubPosTop')}</option>
          </select>
        </div>

        <div className="storyboard-workspace__timeline" role="list" aria-label={uiText('storyboardTimeline')}>
          {episode.scenes.map((sc, i) => {
            const url = sceneUrlForIndex(project, sc.index) || sceneUrls[i]
            const on = i === safeIx
            return (
              <button
                key={sc.index}
                type="button"
                role="listitem"
                className={`storyboard-workspace__tl-chip${on ? ' storyboard-workspace__tl-chip--on' : ''}`}
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

        {activeScene ? (
          <p className="storyboard-workspace__line">
            {activeScene.text.slice(0, 280)}
            {activeScene.text.length > 280 ? '…' : ''}
          </p>
        ) : null}

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
          disabled={rendering || regenBusy || !allSceneImagesReady}
          title={
            !allSceneImagesReady ? uiText('storyboardVideoDisabledHint') : undefined
          }
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
