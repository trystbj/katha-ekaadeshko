import { AnimatePresence, motion } from 'framer-motion'
import { useUiText } from '../i18n/useAppI18n'
import { Glyphs } from '../i18n/uiGlyphs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { validatedScenePreviewUrl } from '../utils/validatedPreviewUrl'
import type { StudioSeasonId } from '../constants/studioSeasonThemes'
import { STUDIO_SEASON_PRESETS, normalizeStudioSeasonId } from '../constants/studioSeasonThemes'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { cinematicFitImgStyle, useCinematicImageFit } from '../hooks/useCinematicImageFit'

export type CastPortraitLayer = { name: string; url: string; role?: string }

type Props = {
  seasonId: StudioSeasonId
  sceneUrls: string[]
  busy: boolean
  jobProgress?: number
  /** Outer section classes (default matches workspace grid). */
  sectionClassName?: string
  /** Omit “Live preview” heading (reference UI). */
  hideHeading?: boolean
  /** When idle and no scene image, show empty dark stage instead of seasonal art. */
  idleBlank?: boolean
  /** Wireframe UX: longer idle caption (fullscreen / script / video). */
  useWireframeExplanation?: boolean
  /** Short celebration burst after a successful pipeline-heavy generation completes. */
  celebrateComplete?: boolean
  /** i18n key for celebration caption (default: video ready). */
  celebrateTitleKey?: string
  /** Pipeline scene URLs — live thumbnail strip while generating. */
  pipelineThumbUrls?: string[]
  /** Override hero still (e.g. character portrait) without leaving the preview panel. */
  heroUrl?: string | null
  /** Active index in `sceneUrls` carousel (embedded preview). */
  carouselIndex?: number
  onCarouselIndexChange?: (index: number) => void
  /** Character portraits composited over the active scene. */
  castPortraits?: CastPortraitLayer[]
  /** When set, carousel index clamps to scene row count (not URL count). */
  sceneCount?: number
  /** Hide bottom thumbnail strip (e.g. storyboard timeline owns navigation). */
  hideIdleThumbStrip?: boolean
  /** Hide bottom scene caption (e.g. storyboard dock owns scene context). */
  hideSceneCaption?: boolean
  /** Hide cast portrait overlays (character preview mode). */
  hideCastLayer?: boolean
  /** Show prev/next scene arrows; clamp at first/last (no wrap). */
  showSceneNav?: boolean
  /** Smart fill (portrait→height, landscape→width) without letterbox waste. */
  cinematicMedia?: boolean
  /** Storyboard: never show seasonal idle art when scene still is empty. */
  suppressSeasonalIdle?: boolean
  /** Character portrait mode — show hero immediately on click (no async gate). */
  instantHeroSwitch?: boolean
}

/** Center cinematic viewport — idle seasonal art, scene rotator, or generating shimmer. */
export function PreviewStage({
  seasonId,
  sceneUrls,
  busy,
  jobProgress,
  sectionClassName = 'workspace-premium__col workspace-premium__stage',
  hideHeading = false,
  idleBlank = false,
  useWireframeExplanation = false,
  celebrateComplete = false,
  celebrateTitleKey = 'previewCelebrateReady',
  pipelineThumbUrls = [],
  heroUrl = null,
  carouselIndex = 0,
  onCarouselIndexChange,
  castPortraits = [],
  sceneCount,
  hideIdleThumbStrip = false,
  hideSceneCaption = false,
  hideCastLayer = false,
  showSceneNav = false,
  cinematicMedia = false,
  suppressSeasonalIdle = false,
  instantHeroSwitch = false
}: Props) {
  const uiText = useUiText()
  const reduced = usePrefersReducedMotion()
  const preset = STUDIO_SEASON_PRESETS[normalizeStudioSeasonId(seasonId)]
  const indexMax = Math.max(0, (sceneCount ?? sceneUrls.length) - 1)
  const safeIx = indexMax >= 0 ? Math.min(Math.max(0, carouselIndex), indexMax) : 0
  const alignedUrl = sceneUrls[safeIx] || ''
  const heroCandidate = heroUrl || alignedUrl || ''
  const [hero, setHero] = useState(instantHeroSwitch ? heroCandidate : '')
  useEffect(() => {
    if (instantHeroSwitch) {
      setHero(heroCandidate)
      return
    }
    setHero('')
    let cancelled = false
    void validatedScenePreviewUrl(heroCandidate).then((url) => {
      if (!cancelled) setHero(url)
    })
    return () => {
      cancelled = true
    }
  }, [heroCandidate, instantHeroSwitch])
  const fitAxis = useCinematicImageFit(cinematicMedia ? hero : null)
  const pct = typeof jobProgress === 'number' ? Math.min(100, Math.max(0, jobProgress)) : undefined
  const blankIdle = Boolean(idleBlank && !hero)
  const emptyStage = blankIdle || (suppressSeasonalIdle && !hero)

  const thumbs = useMemo(() => pipelineThumbUrls.filter(Boolean), [pipelineThumbUrls])
  const totalSlides = sceneCount ?? sceneUrls.length
  const canNav = !busy && totalSlides > 1 && Boolean(onCarouselIndexChange)

  const atFirst = safeIx <= 0
  const atLast = safeIx >= indexMax

  const goPrev = useCallback(() => {
    if (!canNav || !onCarouselIndexChange || atFirst) return
    const next = safeIx - 1
    console.info('[katha:preview]', 'carousel_prev', { from: safeIx, to: next })
    onCarouselIndexChange(next)
  }, [atFirst, canNav, onCarouselIndexChange, safeIx])

  const goNext = useCallback(() => {
    if (!canNav || !onCarouselIndexChange || atLast) return
    const next = safeIx + 1
    console.info('[katha:preview]', 'carousel_next', { from: safeIx, to: next })
    onCarouselIndexChange(next)
  }, [atLast, canNav, onCarouselIndexChange, safeIx])

  useEffect(() => {
    if (!canNav) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canNav, goNext, goPrev])
  const thumbReveal = useMemo(() => {
    if (!thumbs.length) return 0
    const p = typeof jobProgress === 'number' ? jobProgress : pct ?? 18
    return Math.max(1, Math.ceil((p / 100) * thumbs.length))
  }, [thumbs.length, jobProgress, pct])

  return (
    <section className={sectionClassName}>
      {!hideHeading ? (
        <h3 className="tw-text-xs tw-font-bold tw-tracking-[0.12em] tw-uppercase tw-text-amber-200/90 tw-mb-2">
          {uiText('previewStageTitle')}
        </h3>
      ) : null}
      <div
        className={`preview-stage${busy ? ' busy' : ''}${blankIdle ? ' preview-stage--blank-idle' : ''}${hero ? ' preview-stage--has-scene' : ''}${celebrateComplete ? ' preview-stage--celebrate' : ''}${cinematicMedia ? ' preview-stage--cinematic' : ''}${cinematicMedia && hero ? ` preview-stage--fit-${fitAxis}` : ''}${emptyStage && suppressSeasonalIdle ? ' preview-stage--storyboard-empty' : ''}`}
      >
        <div className="preview-stage__inner">
          <AnimatePresence mode="wait">
            {cinematicMedia && hero ? (
              <motion.div
                key={hero}
                className="preview-stage__media preview-stage__media--img"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
              >
                <img
                  src={hero}
                  alt=""
                  className="preview-stage__img"
                  style={cinematicFitImgStyle(fitAxis)}
                  draggable={false}
                />
              </motion.div>
            ) : (
              <motion.div
                key={hero || (emptyStage ? 'blank' : preset.id)}
                className="preview-stage__media"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
                style={{
                  backgroundColor: emptyStage ? 'transparent' : undefined,
                  backgroundImage: hero
                    ? `linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.5)), url(${hero})`
                    : emptyStage
                      ? 'none'
                      : `${preset.overlay}, url(${preset.heroUrl})`,
                  backgroundSize: hero ? 'cover' : undefined,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center center'
                }}
              />
            )}
          </AnimatePresence>
          {busy ? (
            <>
              <div className="preview-stage__scan" />
              <div className="preview-stage__rays preview-stage__rays--soft" aria-hidden />
              <div className="preview-stage__progress">
                <div
                  className={`preview-stage__progress-fill${pct != null ? ' preview-stage__progress-fill--fixed' : ''}`}
                  style={pct != null ? { width: `${pct}%`, animation: 'none' } : undefined}
                />
              </div>
            </>
          ) : null}

          {busy && thumbs.length > 0 ? (
            <div className="preview-stage__thumb-strip" aria-hidden>
              {thumbs.slice(0, Math.min(12, thumbReveal)).map((url, i) => (
                <motion.span
                  key={`${url}-${i}`}
                  className="preview-stage__thumb-tile"
                  style={{ backgroundImage: `url(${url})` }}
                  initial={reduced ? false : { opacity: 0, scale: 0.88, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: Math.min(0.16, i * 0.035) }}
                />
              ))}
            </div>
          ) : null}

          {showSceneNav && canNav ? (
            <div className="preview-stage__nav" aria-label={uiText('previewSceneNavAria')}>
              <button
                type="button"
                className="preview-stage__nav-btn"
                aria-label={uiText('previewScenePrev')}
                disabled={atFirst}
                onClick={goPrev}
              >
                ‹
              </button>
              <button
                type="button"
                className="preview-stage__nav-btn"
                aria-label={uiText('previewSceneNext')}
                disabled={atLast}
                onClick={goNext}
              >
                ›
              </button>
            </div>
          ) : null}

          {!busy && !hideCastLayer && castPortraits.length > 0 ? (
            <div className="preview-stage__cast-layer" aria-hidden={!hero}>
              {castPortraits.map((c, i) => (
                <motion.div
                  key={`${c.name}-${c.url}`}
                  className={`preview-stage__cast-portrait preview-stage__cast-portrait--${i}`}
                  style={{ backgroundImage: `url(${c.url})` }}
                  initial={reduced ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: hero ? 1 : 0.72, y: 0 }}
                  transition={{ duration: 0.42, delay: i * 0.06 }}
                  title={c.name}
                />
              ))}
            </div>
          ) : null}

          {!busy && !hideIdleThumbStrip && totalSlides > 1 && onCarouselIndexChange ? (
            <div className="preview-stage__thumb-strip preview-stage__thumb-strip--idle" role="tablist" aria-label={uiText('previewStageSceneHint')}>
              {sceneUrls.map((url, i) => (
                <button
                  key={`scene-thumb-${i}`}
                  type="button"
                  role="tab"
                  aria-selected={i === safeIx && !heroUrl}
                  className={`preview-stage__thumb-tile preview-stage__thumb-tile--btn${i === safeIx && !heroUrl ? ' preview-stage__thumb-tile--active' : ''}${url ? '' : ' preview-stage__thumb-tile--empty'}`}
                  style={url ? { backgroundImage: `url(${url})` } : undefined}
                  onClick={() => {
                    console.info('[katha:preview]', 'carousel_select', { index: i })
                    onCarouselIndexChange(i)
                  }}
                />
              ))}
            </div>
          ) : null}

          {!hideSceneCaption && (busy || hero || !blankIdle || useWireframeExplanation) ? (
            <div className="preview-stage__caption">
              {busy
                ? uiText('previewStageGenerating')
                : hero
                  ? (sceneCount ?? sceneUrls.length) > 1
                    ? `${uiText('previewStageSceneHint')} (${safeIx + 1}/${sceneCount ?? sceneUrls.length})`
                    : uiText('previewStageSceneHint')
                  : blankIdle && useWireframeExplanation
                    ? uiText('previewStageWireframeExplanation')
                    : uiText('previewStageIdleHint')}
            </div>
          ) : null}

          <AnimatePresence>
            {celebrateComplete ? (
              <motion.div
                key="celebrate"
                className="preview-stage__celebrate"
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
              >
                <div className="preview-stage__celebrate-burst" aria-hidden />
                <motion.div
                  className="preview-stage__celebrate-check"
                  initial={reduced ? false : { scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                >
                  ✓
                </motion.div>
                <p className="preview-stage__celebrate-title">{uiText(celebrateTitleKey)}</p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
