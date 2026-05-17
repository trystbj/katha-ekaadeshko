import { AnimatePresence, motion } from 'framer-motion'
import { useUiText } from '../i18n/useAppI18n'
import { useMemo } from 'react'
import type { StudioSeasonId } from '../constants/studioSeasonThemes'
import { STUDIO_SEASON_PRESETS, normalizeStudioSeasonId } from '../constants/studioSeasonThemes'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

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
  /** Pipeline scene URLs — live thumbnail strip while generating. */
  pipelineThumbUrls?: string[]
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
  pipelineThumbUrls = []
}: Props) {
  const uiText = useUiText()
  const reduced = usePrefersReducedMotion()
  const preset = STUDIO_SEASON_PRESETS[normalizeStudioSeasonId(seasonId)]
  const hero = sceneUrls[0]
  const pct = typeof jobProgress === 'number' ? Math.min(100, Math.max(0, jobProgress)) : undefined
  const blankIdle = Boolean(idleBlank && !hero)

  const thumbs = useMemo(() => pipelineThumbUrls.filter(Boolean), [pipelineThumbUrls])
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
        className={`preview-stage ${busy ? 'busy' : ''}${blankIdle ? ' preview-stage--blank-idle' : ''}${hero ? ' preview-stage--has-scene' : ''}${celebrateComplete ? ' preview-stage--celebrate' : ''}`}
      >
        <div className="preview-stage__inner">
          <AnimatePresence mode="wait">
            <motion.div
              key={hero || (blankIdle ? 'blank' : preset.id)}
              className="preview-stage__media"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
              style={{
                backgroundColor: blankIdle ? 'transparent' : undefined,
                backgroundImage: hero
                  ? `linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.5)), url(${hero})`
                  : blankIdle
                    ? 'none'
                    : `${preset.overlay}, url(${preset.heroUrl})`
              }}
            />
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

          {busy || hero || !blankIdle || useWireframeExplanation ? (
            <div className="preview-stage__caption">
              {busy
                ? uiText('previewStageGenerating')
                : hero
                  ? uiText('previewStageSceneHint')
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
                <p className="preview-stage__celebrate-title">{uiText('previewCelebrateReady')}</p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
