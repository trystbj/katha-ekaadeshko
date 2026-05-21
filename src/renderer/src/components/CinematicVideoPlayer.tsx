import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import { Glyphs } from '../i18n/uiGlyphs'
import type { StoryScene } from '../types/story'
import { getNarrationLanguageMenuRows } from '../constants/narrationLanguages'
import { scenesToWebVtt, scenesSecondaryToWebVtt } from '../utils/scenesWebVtt'
import {
  buildPlaybackTimeline,
  sceneIndexForPlayback,
  seekTimeForSceneIndex,
  timingOverridesFromPlan
} from '../engines/timelineSync'
import { subtitleVttOptionsForPreset, isSubtitlePlaybackPresetId } from '../constants/subtitlePlaybackPresets'
import { buildSubtitleVttLook } from '../utils/buildSubtitleVttLook'
import type { SubtitleStudioState } from '../types/subtitleStudio'
import { useStudioStore } from '../store/useStudioStore'
import type { VoiceDirectorContext } from '../voice/voiceDirector'
import type { CinematicDirectorPlan } from '../../../../core/cinematic/types'
import { useCinematicScene } from '../cinematic/useCinematicScene'
import { useMediaElementSpectrum } from '../hooks/useMediaElementSpectrum'
import { VideoSpectrumBars } from './VideoSpectrumBars'
import { VoiceReactiveBars } from './VoiceReactiveBars'
import type { VideoMotionPreset, VideoStudioDraft } from '../types/videoStudio'
import { cssFilterForPreset } from '../types/videoStudio'
import type { PreviewQualityTier, ProductionWorkflowMode } from '../../../../core/realtime/productionTypes'
import { resolvePreviewQualityProfile } from '../../../../core/realtime/previewQualityProfiles'
import { mergeOptimizationWithTier } from '../../../../core/realtime/autoOptimization'
import { useProductionPipelineStore } from '../store/useProductionPipelineStore'

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const
const FRAME_DT = 1 / 30

const MOTION_LAYER: Record<VideoMotionPreset, string> = {
  static: '',
  slow_zoom_in: 'cinematic-player__motion-layer--slow_zoom_in',
  cinematic_push: 'cinematic-player__motion-layer--cinematic_push',
  pull_out: 'cinematic-player__motion-layer--pull_out',
  parallax_float: 'cinematic-player__motion-layer--parallax_float',
  tilt_dramatic: 'cinematic-player__motion-layer--tilt_dramatic',
  orbit_soft: 'cinematic-player__motion-layer--orbit_soft',
  handheld_micro: 'cinematic-player__motion-layer--handheld_micro',
  smooth_pan: 'cinematic-player__motion-layer--smooth_pan',
  shake_dramatic: 'cinematic-player__motion-layer--shake_dramatic',
  ai_auto_motion: 'cinematic-player__motion-layer--ai_auto_motion'
}

type Props = {
  videoUrl: string
  scenes: StoryScene[]
  storyLanguage: string
  draft: VideoStudioDraft
  onDraftPatch: (patch: Partial<VideoStudioDraft>) => void
  /** Post-export subtitle studio drives captions when both props are set */
  subtitleStudio?: SubtitleStudioState | null
  onSubtitleStudioPatch?: (patch: Partial<SubtitleStudioState>) => void
  /** Pipeline AI cinematic director plan (per-scene motion, environment, expression). */
  cinematicDirectorPlan?: CinematicDirectorPlan | Record<string, unknown> | null
  /** Bumps when creator/live director edits plan — refreshes VTT + timeline sync. */
  liveTimelineRevision?: number
  productionMode?: ProductionWorkflowMode
  previewTier?: PreviewQualityTier
  /** Pipeline scene stills aligned with `scenes[]` order (shown under video during playback). */
  sceneStillUrls?: string[]
}

function formatClock(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function CinematicVideoPlayer({
  videoUrl,
  scenes,
  storyLanguage,
  draft,
  onDraftPatch,
  subtitleStudio: subtitleStudioProp = null,
  onSubtitleStudioPatch,
  cinematicDirectorPlan = null,
  liveTimelineRevision = 0,
  productionMode: productionModeProp,
  previewTier: previewTierProp,
  sceneStillUrls = []
}: Props) {
  const storeMode = useProductionPipelineStore((s) => s.productionMode)
  const storeTier = useProductionPipelineStore((s) => s.previewTier)
  const deviceTier = useProductionPipelineStore((s) => s.deviceTier)
  const productionMode = productionModeProp ?? storeMode
  const previewTier = previewTierProp ?? storeTier
  const previewProfile = useMemo(
    () => resolvePreviewQualityProfile(productionMode, previewTier),
    [productionMode, previewTier]
  )
  const optimization = useMemo(
    () => mergeOptimizationWithTier(deviceTier, previewTier),
    [deviceTier, previewTier]
  )
  const uiText = useUiText()
  const wrapRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const scrubZoneRef = useRef<HTMLDivElement>(null)
  const thumbCanvasRef = useRef<HTMLCanvasElement>(null)
  const thumbWrapRef = useRef<HTMLDivElement>(null)
  const hoverSeekRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { levels, unsupported, attach, start, stop } = useMediaElementSpectrum(videoRef, videoUrl)
  const subsOn = useStudioStore((s) => s.playbackSubtitlesOn)
  const subtitlePresetId = useStudioStore((s) => s.subtitlePlaybackPresetId)
  const setPlaybackSubtitlesOn = useStudioStore((s) => s.setPlaybackSubtitlesOn)
  const project = useStudioStore((s) => s.project)
  const narrationDraft = useStudioStore((s) => s.narrationDraft)
  const styleId = useStudioStore((s) => s.styleId)
  const customVisualPrompt = useStudioStore((s) => s.customVisualPrompt)
  const storyTone = useStudioStore((s) => s.storyTone)
  const backendGenre = useStudioStore((s) => s.backendGenre)
  const narratorId = useStudioStore((s) => s.narratorId)

  const studioMode = Boolean(subtitleStudioProp && onSubtitleStudioPatch)
  const subtitleStudio = subtitleStudioProp ?? undefined

  const [subtitleLang, setSubtitleLang] = useState(() => storyLanguage || 'en')
  const [audioOn, setAudioOn] = useState(true)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [thumbHover, setThumbHover] = useState(false)
  const [thumbLeftPct, setThumbLeftPct] = useState(0)
  const [thumbLabel, setThumbLabel] = useState('')

  useEffect(() => {
    setSubtitleLang(storyLanguage || 'en')
  }, [storyLanguage])

  useEffect(() => {
    if (!studioMode || !onSubtitleStudioPatch || !subtitleStudioProp) return
    if (!isSubtitlePlaybackPresetId(subtitlePresetId)) return
    if (subtitlePresetId === subtitleStudioProp.playbackPresetId) return
    onSubtitleStudioPatch({ playbackPresetId: subtitlePresetId })
  }, [studioMode, onSubtitleStudioPatch, subtitleStudioProp, subtitlePresetId])

  const vttLook = useMemo(() => {
    if (studioMode && subtitleStudio) return buildSubtitleVttLook(subtitleStudio)
    return subtitleVttOptionsForPreset(subtitlePresetId)
  }, [studioMode, subtitleStudio, subtitlePresetId])

  const voiceContext = useMemo((): VoiceDirectorContext | undefined => {
    const narration = project?.narration ?? narrationDraft
    if (!narration?.autoVoiceDirector) return { autoVoiceDirector: false }
    return {
      storyLanguage,
      languageId: narration.languageId,
      genre: backendGenre,
      storyTone,
      styleId: styleId || undefined,
      customVisualPrompt,
      narratorId,
      autoVoiceDirector: narration.autoVoiceDirector,
      narratorGenderPreference: narration.narratorGenderPreference
    }
  }, [
    project?.narration,
    narrationDraft,
    storyLanguage,
    backendGenre,
    storyTone,
    styleId,
    customVisualPrompt,
    narratorId
  ])

  const planRecord = cinematicDirectorPlan as Record<string, unknown> | null | undefined

  const playbackTimeline = useMemo(() => {
    void liveTimelineRevision
    return buildPlaybackTimeline(planRecord, scenes.length, duration || undefined)
  }, [planRecord, scenes.length, duration, liveTimelineRevision])

  const planTiming = useMemo(() => {
    void liveTimelineRevision
    return timingOverridesFromPlan(planRecord, scenes.length)
  }, [planRecord, scenes.length, liveTimelineRevision])

  const secondsPerScene = playbackTimeline.secondsPerScene

  const vttUrl = useMemo(() => {
    void liveTimelineRevision
    if (!scenes.length) return null
    const body =
      studioMode && subtitleStudio
        ? scenesToWebVtt(scenes, secondsPerScene, vttLook, subtitleStudio, voiceContext, planTiming)
        : scenesToWebVtt(scenes, secondsPerScene, vttLook, null, voiceContext, planTiming)
    const blob = new Blob([body], { type: 'text/vtt;charset=utf-8' })
    return URL.createObjectURL(blob)
  }, [scenes, secondsPerScene, vttLook, studioMode, subtitleStudio, voiceContext, planTiming, liveTimelineRevision])

  const secondaryVttUrl = useMemo(() => {
    if (!studioMode || !subtitleStudio?.dualLangEnabled) return null
    const body = scenesSecondaryToWebVtt(scenes, secondsPerScene, vttLook, subtitleStudio)
    if (!body) return null
    const blob = new Blob([body], { type: 'text/vtt;charset=utf-8' })
    return URL.createObjectURL(blob)
  }, [scenes, secondsPerScene, vttLook, studioMode, subtitleStudio])

  useEffect(() => {
    return () => {
      console.info('[katha:render] player_vtt_cleanup', { videoUrl })
      if (vttUrl) URL.revokeObjectURL(vttUrl)
      if (secondaryVttUrl) URL.revokeObjectURL(secondaryVttUrl)
    }
  }, [vttUrl, secondaryVttUrl, videoUrl])

  const syncTextTracks = useCallback(() => {
    const el = videoRef.current
    if (!el?.textTracks?.length) return
    for (let i = 0; i < el.textTracks.length; i++) {
      el.textTracks[i].mode = subsOn ? 'showing' : 'hidden'
    }
  }, [subsOn])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    el.muted = !audioOn
  }, [audioOn])

  useEffect(() => {
    syncTextTracks()
  }, [syncTextTracks, vttUrl, videoUrl, subtitleLang])

  const narrationSubtitleLangRows = useMemo(() => getNarrationLanguageMenuRows(), [])
  const trackLabel =
    narrationSubtitleLangRows.find((r) => r.id === subtitleLang)?.label ?? subtitleLang

  const sceneIndex = useMemo(() => {
    const ix = sceneIndexForPlayback(playbackTimeline, currentTime)
    return Math.max(0, Math.min(Math.max(0, scenes.length - 1), ix))
  }, [currentTime, scenes.length, playbackTimeline])

  const sceneStillUrl = sceneStillUrls[sceneIndex] || ''
  useEffect(() => {
    if (sceneStillUrl) {
      console.info('[katha:preview]', 'player_scene_still', { sceneIndex: sceneIndex + 1, hasUrl: true })
    }
  }, [sceneStillUrl, sceneIndex])

  const draftMotion: VideoMotionPreset =
    draft.motionBySceneIndex[sceneIndex + 1] ?? draft.motionGlobal

  const cinematicScene = useCinematicScene(cinematicDirectorPlan, sceneIndex, draftMotion)
  const hasUserSceneMotion = draft.motionBySceneIndex[sceneIndex + 1] != null
  const autoDirected =
    cinematicDirectorPlan &&
    (cinematicDirectorPlan as CinematicDirectorPlan).autoDirected !== false
  const useDirectorMotion =
    Boolean(autoDirected) && !hasUserSceneMotion && draftMotion === 'ai_auto_motion'
  const motionPreset: VideoMotionPreset = useDirectorMotion
    ? cinematicScene.motionPreset
    : draftMotion

  const motionClass = [
    MOTION_LAYER[motionPreset] || '',
    cinematicScene.actingClass,
    cinematicScene.memoryClass
  ]
    .filter(Boolean)
    .join(' ')

  const overlayFilter = useMemo(() => {
    const base = cssFilterForPreset(draft.filterId)
    const r = draft.recipe
    const bits: string[] = []
    if (base && base !== 'none') bits.push(base)
    if (r.vignette > 0) bits.push(`brightness(${1 - r.vignette * 0.06})`)
    if (r.grain > 0) bits.push(`contrast(${1 + r.grain * 0.04})`)
    const sharpen = r.sharpenPreview + previewProfile.sharpenPreview * 0.5
    if (sharpen > 0) bits.push(`contrast(${1 + sharpen * 0.05})`)
    if (previewProfile.grain > 0) bits.push(`contrast(${1 + previewProfile.grain * 0.04})`)
    return bits.length ? bits.join(' ') : 'none'
  }, [draft.filterId, draft.recipe, previewProfile])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.loop = draft.loopPlayback
  }, [draft.loopPlayback])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const rate = draft.playbackSpeed
    if (PLAYBACK_RATES.includes(rate as (typeof PLAYBACK_RATES)[number])) {
      v.playbackRate = rate
    } else {
      v.playbackRate = 1
    }
  }, [draft.playbackSpeed])

  const seekTo = useCallback((t: number) => {
    const v = videoRef.current
    if (!v) return
    const end = Number.isFinite(v.duration) ? v.duration : duration
    const trimHi = end > 0 ? Math.max(0, end - draft.trimEndSec) : Infinity
    const lo = Math.max(0, draft.trimStartSec)
    const hi = trimHi
    const next = Math.max(lo, Math.min(hi || t, t))
    v.currentTime = next
    setCurrentTime(next)
  }, [draft.trimEndSec, draft.trimStartSec, duration])

  const drawThumbAt = useCallback((time: number) => {
    const v = videoRef.current
    const cv = thumbCanvasRef.current
    if (!v || !cv || !v.videoWidth) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const tw = 132 * 2
    const th = 74 * 2
    cv.width = tw
    cv.height = th
    ctx.drawImage(v, 0, 0, tw, th)
    setThumbLabel(formatClock(time))
  }, [])

  const scheduleThumbSeek = useCallback(
    (ratio: number) => {
      if (hoverSeekRef.current) clearTimeout(hoverSeekRef.current)
      hoverSeekRef.current = setTimeout(() => {
        hoverSeekRef.current = null
        const v = videoRef.current
        if (!v || !duration) return
        const t = ratio * duration
        const onSeeked = () => {
          drawThumbAt(t)
          v.removeEventListener('seeked', onSeeked)
        }
        v.addEventListener('seeked', onSeeked)
        v.currentTime = Math.min(Math.max(0, t), Math.max(0.001, duration - 0.05))
      }, 160)
    },
    [duration, drawThumbAt]
  )

  const onScrubMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const z = scrubZoneRef.current
      if (!z || !duration) return
      const r = z.getBoundingClientRect()
      const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
      setThumbLeftPct(ratio * 100)
      setThumbHover(true)
      scheduleThumbSeek(ratio)
    },
    [duration, scheduleThumbSeek]
  )

  const onScrubLeave = useCallback(() => {
    setThumbHover(false)
    if (hoverSeekRef.current) clearTimeout(hoverSeekRef.current)
  }, [])

  const togglePlay = useCallback(async () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      await attach()
      start()
      await v.play()
      setPlaying(true)
    } else {
      v.pause()
      stop()
      setPlaying(false)
    }
  }, [attach, start, stop])

  const toggleFs = useCallback(async () => {
    const el = wrapRef.current
    if (!el) return
    try {
      if (!document.fullscreenElement) await el.requestFullscreen()
      else await document.exitFullscreen()
    } catch {
      /* ignore */
    }
  }, [])

  const togglePip = useCallback(async () => {
    const v = videoRef.current
    if (!v || !(document as Document & { pictureInPictureEnabled?: boolean }).pictureInPictureEnabled)
      return
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture()
      else await v.requestPictureInPicture()
    } catch {
      /* ignore */
    }
  }, [])

  const stepFrame = useCallback(
    (dir: -1 | 1) => {
      const v = videoRef.current
      if (!v) return
      v.pause()
      stop()
      setPlaying(false)
      seekTo(v.currentTime + dir * FRAME_DT)
    },
    [seekTo, stop]
  )

  const gotoChapter = useCallback(
    (delta: -1 | 1) => {
      const next = sceneIndex + delta
      if (next < 0 || next >= scenes.length) return
      seekTo(seekTimeForSceneIndex(playbackTimeline, next))
    },
    [sceneIndex, scenes.length, seekTo, playbackTimeline]
  )

  const exportPreviewFrame = useCallback(() => {
    const v = videoRef.current
    if (!v?.videoWidth) return
    const c = document.createElement('canvas')
    c.width = v.videoWidth
    c.height = v.videoHeight
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.drawImage(v, 0, 0)
    c.toBlob((blob) => {
      if (!blob) return
      const u = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = u
      a.download = `katha-preview-frame-${Math.floor(v.currentTime * 1000)}.png`
      a.click()
      URL.revokeObjectURL(u)
    })
  }, [])

  const muxedStemHint = uiText('videoStemMuxedHint')

  const videoQualityClass =
    draft.previewQuality === 'sd' ? ' cinematic-player__video--sd' : ''

  const playerModeClass =
    productionMode === 'quick' ? ' cinematic-player--quick-mode' : ''

  const vfxOpacity = Math.min(1, previewProfile.vfxDensity * optimization.vfxDensity)

  return (
    <div className={`cinematic-player render-playback${playerModeClass}`}>
      <div ref={wrapRef} className="cinematic-player__viewport-wrap">
        <div
          className={`cinematic-player__motion-layer${motionClass ? ` ${motionClass}` : ''}`}
          style={{
            filter: overlayFilter === 'none' ? undefined : overlayFilter,
            boxShadow: draft.recipe.letterbox
              ? 'inset 0 56px 0 rgba(0,0,0,0.92), inset 0 -56px 0 rgba(0,0,0,0.92)'
              : undefined,
            ...cinematicScene.envStyle
          }}
        >
          <div className="cinematic-player__atmos" style={cinematicScene.envStyle} aria-hidden />
          <div
            className="cinematic-player__vfx"
            style={{ ...cinematicScene.ultimateStyle, opacity: vfxOpacity }}
            aria-hidden
          />
          <div className="cinematic-player__evo" style={cinematicScene.evolutionStyle} aria-hidden />
          {sceneStillUrl ? (
            <div
              className="cinematic-player__scene-still"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.42)), url(${sceneStillUrl})`
              }}
              aria-hidden
            />
          ) : null}
          <video
            key={videoUrl}
            ref={videoRef}
            className={`cinematic-player__video render-playback__video${videoQualityClass}`}
            playsInline
            preload="metadata"
            crossOrigin="anonymous"
            src={videoUrl}
            controls={false}
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration
              setDuration(Number.isFinite(d) ? d : 0)
              syncTextTracks()
            }}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onPlay={() => {
              setPlaying(true)
              void attach().then(() => start())
            }}
            onPause={() => {
              setPlaying(false)
              stop()
            }}
            onEnded={() => {
              setPlaying(false)
              stop()
            }}
          >
            {vttUrl ? (
              <track
                key={`${subtitleLang}-${studioMode ? 'studio' : subtitlePresetId}-${subtitleStudio?.playbackPresetId ?? ''}`}
                kind="subtitles"
                src={vttUrl}
                srcLang={subtitleLang}
                label={`${uiText('subtitlesLabel')} · ${trackLabel}`}
                default
              />
            ) : null}
            {secondaryVttUrl && subtitleStudio ? (
              <track
                key={`sec-${subtitleStudio.dualLangCode}-${videoUrl}`}
                kind="subtitles"
                src={secondaryVttUrl}
                srcLang={subtitleStudio.dualLangCode}
                label={`${uiText('subtitlesLabel')} · ${subtitleStudio.dualLangCode}`}
              />
            ) : null}
          </video>
        </div>

      </div>

      {playing ? (
        <div className="render-playback__spectrum">
          {unsupported ? (
            <VoiceReactiveBars active={audioOn && playing} bars={14} />
          ) : (
            <VideoSpectrumBars levels={levels} />
          )}
        </div>
      ) : null}

      <div ref={scrubZoneRef} className="cinematic-player__scrub-zone" onMouseLeave={onScrubLeave}>
        <div
          ref={thumbWrapRef}
          className={`cinematic-player__thumb-preview${thumbHover ? ' cinematic-player__thumb-preview--on' : ''}`}
          style={{ left: `${thumbLeftPct}%`, transform: 'translateX(-50%)' }}
        >
          <canvas ref={thumbCanvasRef} />
          <span>{thumbLabel}</span>
        </div>
        <div className="cinematic-player__markers" aria-hidden>
          {scenes.map((_, i) => (
            <div
              key={i}
              className={`cinematic-player__marker${i === sceneIndex ? ' cinematic-player__marker--current' : ''}`}
            />
          ))}
        </div>
        <input
          type="range"
          className="cinematic-player__range"
          min={0}
          max={Math.max(0.001, duration)}
          step={0.04}
          value={Math.min(currentTime, duration)}
          onMouseMove={onScrubMouseMove}
          onChange={(e) => seekTo(Number(e.target.value))}
          aria-label={uiText('videoTimelineAria')}
        />
      </div>

      <div className="cinematic-player__chrome">
        <button
          type="button"
          className="cinematic-player__icon-btn"
          onClick={() => void togglePlay()}
          aria-label={playing ? uiText('videoPause') : uiText('videoPlay')}
        >
          {playing ? Glyphs.pauseMedia : Glyphs.playTriangle}
        </button>
        <span className="cinematic-player__times">
          {formatClock(currentTime)}
          {Glyphs.slash}
          {Glyphs.space}
          {formatClock(duration)}
        </span>
        <button type="button" className="cinematic-player__icon-btn" onClick={() => gotoChapter(-1)} disabled={sceneIndex <= 0} title={uiText('videoChapterPrev')} aria-label={uiText('videoChapterPrev')}>
          {Glyphs.prevTrack}
        </button>
        <button type="button" className="cinematic-player__icon-btn" onClick={() => gotoChapter(1)} disabled={sceneIndex >= scenes.length - 1} title={uiText('videoChapterNext')} aria-label={uiText('videoChapterNext')}>
          {Glyphs.nextChapter}
        </button>
        <button type="button" className="cinematic-player__icon-btn" onClick={() => stepFrame(-1)} title={uiText('videoFrameBack')} aria-label={uiText('videoFrameBack')}>
          {Glyphs.minus}
        </button>
        <button type="button" className="cinematic-player__icon-btn" onClick={() => stepFrame(1)} title={uiText('videoFrameFwd')} aria-label={uiText('videoFrameFwd')}>
          {Glyphs.plus}
        </button>

        <span className="cinematic-player__grow" />

        <label className="cinematic-player__select">
          <span className="tw-sr-only">{uiText('videoPlaybackSpeed')}</span>
          <select
            className="select"
            value={draft.playbackSpeed}
            onChange={(e) => onDraftPatch({ playbackSpeed: Number(e.target.value) })}
          >
            {PLAYBACK_RATES.map((r) => (
              <option key={r} value={r}>
                {r}
                {Glyphs.lowerX}
              </option>
            ))}
          </select>
        </label>

        <label className="cinematic-player__select">
          <span className="tw-sr-only">{uiText('videoQualityPreview')}</span>
          <select
            className="select"
            value={draft.previewQuality}
            onChange={(e) =>
              onDraftPatch({
                previewQuality: e.target.value as VideoStudioDraft['previewQuality']
              })
            }
          >
            <option value="source">{uiText('videoQualitySource')}</option>
            <option value="hd">{uiText('videoQualityHd')}</option>
            <option value="sd">{uiText('videoQualitySd')}</option>
          </select>
        </label>

        <label className="tw-flex tw-items-center tw-gap-1 cinematic-player__select">
          <input
            type="checkbox"
            checked={draft.loopPlayback}
            onChange={(e) => onDraftPatch({ loopPlayback: e.target.checked })}
          />
          {uiText('videoLoop')}
        </label>

        <span className="tw-sr-only">{uiText('videoVolume')}</span>
        <input
          type="range"
          className="cinematic-player__vol"
          min={0}
          max={1}
          step={0.03}
          defaultValue={1}
          onChange={(e) => {
            const v = videoRef.current
            if (v) v.volume = Number(e.target.value)
          }}
          aria-label={uiText('videoVolume')}
        />

        <button type="button" className="cinematic-player__icon-btn" onClick={() => void toggleFs()} title={uiText('videoFullscreen')} aria-label={uiText('videoFullscreen')}>
          {Glyphs.fullscreen}
        </button>
        <button type="button" className="cinematic-player__icon-btn" onClick={() => void togglePip()} title={uiText('videoPip')} aria-label={uiText('videoPip')}>
          {Glyphs.pip}
        </button>
        <button type="button" className="cinematic-player__icon-btn" onClick={exportPreviewFrame} title={uiText('videoExportFrame')} aria-label={uiText('videoExportFrame')}>
          {Glyphs.camera}
        </button>
      </div>

      <div className="cinematic-player__checks render-playback__controls">
        <label className="render-playback__check">
          <input
            type="checkbox"
            checked={subsOn}
            onChange={(e) => {
              const v = e.target.checked
              setPlaybackSubtitlesOn(v)
              if (studioMode && onSubtitleStudioPatch) onSubtitleStudioPatch({ subtitlesOn: v })
            }}
          />
          {uiText('subtitlesOn')}
        </label>
        <label className="render-playback__check">
          <input type="checkbox" checked={audioOn} onChange={(e) => setAudioOn(e.target.checked)} />
          {uiText('videoStoryAudio')}
        </label>
        <label className="render-playback__check" title={muxedStemHint}>
          <input type="checkbox" checked disabled aria-disabled />
          {uiText('videoMusicBed')} <span className="cinematic-player__help">{Glyphs.infoCircled}</span>
        </label>
        <label className="render-playback__check" title={muxedStemHint}>
          <input type="checkbox" checked disabled aria-disabled />
          {uiText('videoSfx')} <span className="cinematic-player__help">{Glyphs.infoCircled}</span>
        </label>
        <label className="render-playback__sub-lang">
          <span className="render-playback__sub-lang-label">{uiText('subtitleTrackLanguage')}</span>
          <select
            className="select render-playback__select"
            value={subtitleLang}
            onChange={(e) => setSubtitleLang(e.target.value)}
          >
            {narrationSubtitleLangRows.map((l) => (
              <option key={l.id} value={l.id}>
                {l.flag} {l.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="render-playback__hint">{uiText('subtitleContentHint')}</p>
    </div>
  )
}
