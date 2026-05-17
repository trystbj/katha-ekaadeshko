import { AnimatePresence, motion } from 'framer-motion'
import { useUiText } from '../i18n/useAppI18n'
import { Glyphs } from '../i18n/uiGlyphs'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { cinematicStageLabelKey, refinedEtaSeconds } from '../utils/cinematicStageLabel'
import { formatDurationShort, isVideoOrTranscodeStage, stageToStepIndex } from '../utils/generationJobDisplay'
import type { RenderSpeedTone } from '../utils/pipelineProgressParse'
import { parsePipelineSceneSlice, renderSpeedTone } from '../utils/pipelineProgressParse'
import '../styles/studio-generation-banner.css'

const STEP_KEYS = [
  'ceremonyStepWriting',
  'ceremonyStepCharacters',
  'ceremonyStepScene',
  'ceremonyStepDialogue',
  'ceremonyStepVoice',
  'ceremonyStepVideo',
  'ceremonyStepFinal'
] as const

const FUN_ROTATION_KEYS = [
  'cinemaFunMsg1',
  'cinemaFunMsg2',
  'cinemaFunMsg3',
  'cinemaFunMsg4',
  'cinemaFunMsg5'
] as const

type JobSlice = {
  id: string
  stage: string
  progress: number
  log: string[]
} | null

type Props = {
  visible: boolean
  busyLabel: string | null
  job: JobSlice
  /** Scene still URLs — thumbnail strip during pipeline. */
  sceneThumbnailUrls?: string[]
  /** When stage omits `image i/n`, estimate total scenes for ETA hints. */
  sceneTotalEstimate?: number
  /** Abort in-flight streamed pipeline (Generate Story / similar). */
  onCancelPipeline?: () => void
}

export function StudioGenerationBanner({
  visible,
  busyLabel,
  job,
  sceneThumbnailUrls = [],
  sceneTotalEstimate = 0,
  onCancelPipeline
}: Props) {
  const uiText = useUiText()
  const ringGradId = useId().replace(/:/g, '')
  const reduced = usePrefersReducedMotion()
  const [tick, setTick] = useState(0)
  const [sessionStart, setSessionStart] = useState<number | null>(null)
  const [paused, setPaused] = useState(false)
  const [pausedExtraMs, setPausedExtraMs] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)
  const pauseBeganRef = useRef<number | null>(null)
  const prevSpeedSampleRef = useRef<{ p: number; t: number } | null>(null)
  const [renderSpeed, setRenderSpeed] = useState<RenderSpeedTone>('steady')

  const [renderModeIx, setRenderModeIx] = useState(0)
  const [priorityIx, setPriorityIx] = useState(0)

  useEffect(() => {
    if (!visible) {
      setSessionStart(null)
      setPaused(false)
      setPausedExtraMs(0)
      setElapsedMs(0)
      pauseBeganRef.current = null
      prevSpeedSampleRef.current = null
      setRenderSpeed('steady')
      return
    }
    setSessionStart(Date.now())
    setPaused(false)
    setPausedExtraMs(0)
    pauseBeganRef.current = null
    prevSpeedSampleRef.current = null
    setRenderSpeed('steady')
  }, [visible, busyLabel])

  useEffect(() => {
    if (!visible) {
      setElapsedMs(0)
      return
    }
    const pulse = () => {
      if (!reduced) setTick((n) => n + 1)
      const ss = sessionStart
      if (ss == null) {
        setElapsedMs(0)
        return
      }
      let extraPause = pausedExtraMs
      if (paused && pauseBeganRef.current != null) extraPause += Date.now() - pauseBeganRef.current
      setElapsedMs(Math.max(0, Date.now() - ss - extraPause))
    }
    pulse()
    const ms = reduced ? 1400 : paused ? 720 : 420
    const id = window.setInterval(pulse, ms)
    return () => window.clearInterval(id)
  }, [visible, paused, reduced, sessionStart, pausedExtraMs])

  const togglePause = () => {
    if (!paused) {
      pauseBeganRef.current = Date.now()
      setPaused(true)
      return
    }
    const start = pauseBeganRef.current
    if (start != null) setPausedExtraMs((m) => m + (Date.now() - start))
    pauseBeganRef.current = null
    setPaused(false)
  }

  const progressPct = useMemo(() => {
    const p = job?.progress
    if (typeof p === 'number' && Number.isFinite(p)) return Math.min(100, Math.max(0, p))
    if (!visible) return 0
    return 22 + ((tick * 7) % 58)
  }, [job?.progress, visible, tick])

  const elapsedSec = elapsedMs / 1000

  useEffect(() => {
    if (!visible || paused) return
    const p = typeof job?.progress === 'number' ? job.progress : progressPct
    setRenderSpeed(
      renderSpeedTone({
        progress: p,
        elapsedSec,
        prevSample: prevSpeedSampleRef.current
      })
    )
    prevSpeedSampleRef.current = { p, t: elapsedSec }
  }, [visible, paused, job?.progress, progressPct, elapsedSec])

  const sceneSlice = useMemo(() => {
    const fromStage = parsePipelineSceneSlice(job?.stage || '')
    if (fromStage) return fromStage
    return null
  }, [job?.stage])

  const etaSeconds = useMemo(() => {
    if (!visible || paused) return null
    const p = typeof job?.progress === 'number' ? job.progress : progressPct
    return refinedEtaSeconds({
      progress: p,
      elapsedSec,
      sceneSlice,
      sceneTotalFallback: sceneTotalEstimate
    })
  }, [visible, paused, job?.progress, progressPct, elapsedSec, sceneSlice, sceneTotalEstimate])

  const etaLabel = useMemo(() => {
    if (!visible) return ''
    if (paused) return uiText('cinemaEtaPaused')
    if (etaSeconds === null) return uiText('generationEtaCalibrating')
    if (etaSeconds === 0) return uiText('generationEtaFinishing')
    return uiText('cinemaEtaRemainApprox', { time: formatDurationShort(etaSeconds) })
  }, [visible, paused, etaSeconds, uiText])

  const speedKey =
    renderSpeed === 'ahead' ? 'cinemaSpeedAhead' : renderSpeed === 'behind' ? 'cinemaSpeedBehind' : 'cinemaSpeedSteady'

  const activeIdx = useMemo(
    () => stageToStepIndex(job?.stage, job?.progress ?? 0, busyLabel, tick),
    [job?.stage, job?.progress, busyLabel, tick]
  )

  const isVideo = useMemo(
    () => isVideoOrTranscodeStage(job?.stage, busyLabel),
    [job?.stage, busyLabel]
  )

  const logTail = job?.log?.length ? job.log.slice(-3).join('\n') : ''
  const stageKey = cinematicStageLabelKey(job?.stage || '', logTail)

  const funLineKey = FUN_ROTATION_KEYS[tick % FUN_ROTATION_KEYS.length]

  const thumbs = sceneThumbnailUrls.filter(Boolean)
  const revealedThumbs =
    thumbs.length && typeof job?.progress === 'number'
      ? Math.max(1, Math.ceil((job.progress / 100) * thumbs.length))
      : thumbs.length
        ? Math.max(1, Math.ceil((progressPct / 100) * thumbs.length))
        : 0

  const ringRadius = 15
  const ringCirc = 2 * Math.PI * ringRadius
  const dashOffset = ringCirc * (1 - Math.min(1, progressPct / 100))

  const renderModeHintKey = ['cinemaBgRenderNormal', 'cinemaBgRenderBackground', 'cinemaBgRenderEco'][renderModeIx % 3]
  const priorityHintKey = ['cinemaPriorityBalanced', 'cinemaPriorityQuality', 'cinemaPriorityFast'][priorityIx % 3]

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="gen-banner"
          className={`studio-generation-banner${isVideo ? ' studio-generation-banner--video-phase' : ''}`}
          role="status"
          aria-live="polite"
          aria-busy="true"
          initial={reduced ? false : { opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0, y: -10 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.7 }}
        >
          <div className="studio-generation-banner__particles" aria-hidden />
          <div className="studio-generation-banner__glow" aria-hidden />
          <div className="studio-generation-banner__inner">
            <div className="studio-generation-banner__hero-row">
              <div className="studio-generation-banner__ring-wrap" aria-hidden={reduced}>
                <svg className="studio-generation-banner__ring-svg" viewBox="0 0 36 36">
                  <defs>
                    <linearGradient id={ringGradId} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="rgba(212, 175, 55, 0.35)" />
                      <stop offset="55%" stopColor="rgba(255, 236, 189, 0.95)" />
                      <stop offset="100%" stopColor="rgba(212, 175, 55, 0.55)" />
                    </linearGradient>
                  </defs>
                  <circle className="studio-generation-banner__ring-track" cx="18" cy="18" r={ringRadius} />
                  <motion.circle
                    className="studio-generation-banner__ring-fill"
                    cx="18"
                    cy="18"
                    r={ringRadius}
                    stroke={`url(#${ringGradId})`}
                    strokeWidth={2.6}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={ringCirc}
                    initial={false}
                    animate={{ strokeDashoffset: reduced ? 0 : dashOffset }}
                    transition={{ type: 'spring', stiffness: 120, damping: 22 }}
                    transform="rotate(-90 18 18)"
                  />
                </svg>
                <span className="studio-generation-banner__ring-label">
                  {Math.round(progressPct)}
                  {Glyphs.percent}
                </span>
              </div>

              <div className="studio-generation-banner__hero-copy">
                <div className="studio-generation-banner__head">
                  <span className="studio-generation-banner__spark" aria-hidden>
                    {Glyphs.sparkles}
                  </span>
                  <div className="studio-generation-banner__titles">
                    <span className="studio-generation-banner__pct-line">
                      {uiText('cinemaPctComplete', { n: Math.round(progressPct) })}
                    </span>
                    <span className="studio-generation-banner__title">{uiText('ceremonyWorking')}</span>
                    {busyLabel ? <span className="studio-generation-banner__busy">{busyLabel}</span> : null}
                  </div>
                </div>

                <div className="studio-generation-banner__times">
                  <span className="studio-generation-banner__time-chip">
                    {uiText('cinemaElapsed', { time: formatDurationShort(Math.floor(elapsedSec)) })}
                  </span>
                  <span className="studio-generation-banner__time-chip studio-generation-banner__time-chip--eta">
                    {etaLabel}
                  </span>
                  <span className="studio-generation-banner__time-chip studio-generation-banner__time-chip--speed">
                    {uiText(speedKey)}
                  </span>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={stageKey}
                    className="studio-generation-banner__stage-chip"
                    initial={reduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? undefined : { opacity: 0, y: -4 }}
                    transition={{ duration: 0.35 }}
                  >
                    {uiText(stageKey)}
                  </motion.div>
                </AnimatePresence>

                {sceneSlice ? (
                  <p className="studio-generation-banner__scene-line">
                    {uiText('cinemaSceneRendering', { cur: sceneSlice.current, total: sceneSlice.total })}
                  </p>
                ) : sceneTotalEstimate > 0 ? (
                  <p className="studio-generation-banner__scene-line studio-generation-banner__scene-line--muted">
                    {uiText('cinemaScenesTotalHint', { n: sceneTotalEstimate })}
                  </p>
                ) : null}

                <p className="studio-generation-banner__fun">{uiText(funLineKey)}</p>
              </div>
            </div>

            <div className="studio-generation-banner__bar-wrap" aria-hidden>
              <motion.div
                className="studio-generation-banner__bar"
                initial={false}
                animate={{ width: `${progressPct}%` }}
                transition={{ type: 'spring', stiffness: 200, damping: 26 }}
              />
              <div className="studio-generation-banner__bar-energy" />
              <div className="studio-generation-banner__bar-shimmer" />
            </div>

            <div className="studio-generation-banner__meta-row">
              <span className="studio-generation-banner__stage-inline">
                {job?.stage ? (
                  <span className={isVideo ? 'studio-generation-banner__stage--video' : ''}>
                    {isVideo ? `${uiText('generationVideoPhase')}: ` : ''}
                    {job.stage}
                  </span>
                ) : null}
              </span>
              {typeof job?.progress === 'number' ? (
                <span className="studio-generation-banner__pct-tab">
                  {Math.round(job.progress)}
                  {Glyphs.percent}
                </span>
              ) : null}
            </div>

            <div className="studio-generation-banner__steps" aria-label={uiText('generationStepsAria')}>
              {STEP_KEYS.map((key, i) => (
                <span
                  key={key}
                  className={`studio-generation-banner__dot${i <= activeIdx ? ' studio-generation-banner__dot--on' : ''}${
                    i === activeIdx ? ' studio-generation-banner__dot--pulse' : ''
                  }`}
                  title={uiText(key)}
                />
              ))}
            </div>

            {thumbs.length > 0 ? (
              <div className="studio-generation-banner__thumbs" aria-label={uiText('cinemaThumbStripLabel')}>
                {thumbs.slice(0, Math.min(11, revealedThumbs)).map((url, i) => (
                  <motion.span
                    key={`${url}-${i}`}
                    className="studio-generation-banner__thumb"
                    style={{ backgroundImage: `url(${url})` }}
                    initial={reduced ? false : { opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.38, delay: Math.min(0.15, i * 0.04) }}
                  />
                ))}
              </div>
            ) : null}

            <div className="studio-generation-banner__controls">
              <button type="button" className="btn btn-ghost btn-small" onClick={togglePause}>
                {paused ? uiText('cinemaResumeEta') : uiText('cinemaPauseEta')}
              </button>
              {onCancelPipeline ? (
                <button type="button" className="btn btn-ghost btn-small" onClick={() => onCancelPipeline()}>
                  {uiText('cinemaCancelPipeline')}
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn-ghost btn-small"
                title={uiText(renderModeHintKey)}
                onClick={() => setRenderModeIx((x) => x + 1)}
              >
                {uiText('cinemaBgRenderCycle')}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                title={uiText(priorityHintKey)}
                onClick={() => setPriorityIx((x) => x + 1)}
              >
                {uiText('cinemaPriorityCycle')}
              </button>
            </div>
            <p className="studio-generation-banner__mode-hint">
              <span>{uiText(renderModeHintKey)}</span>
              <span className="studio-generation-banner__mode-dot" aria-hidden>
                {Glyphs.middot}
              </span>
              <span>{uiText(priorityHintKey)}</span>
            </p>

            {job?.log?.length ? (
              <p className="studio-generation-banner__log">{job.log[job.log.length - 1]}</p>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
