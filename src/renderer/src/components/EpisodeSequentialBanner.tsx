import { AnimatePresence, motion } from 'framer-motion'
import { useUiText } from '../i18n/useAppI18n'
import { Glyphs } from '../i18n/uiGlyphs'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { episodeArcLabelKey } from '../utils/episodeSeriesFlow'

type Props = {
  /** Episode number that just finished export (drives one-shot banner). */
  flashEpisodeDone: number | null
  totalEpisodes: number
}

export function EpisodeSequentialBanner({ flashEpisodeDone, totalEpisodes }: Props) {
  const uiText = useUiText()
  const reduced = usePrefersReducedMotion()
  if (flashEpisodeDone == null || totalEpisodes <= 1) return null

  const nextN = flashEpisodeDone + 1
  if (nextN > totalEpisodes) return null
  const arcKey = episodeArcLabelKey(nextN, totalEpisodes)

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={flashEpisodeDone}
        className="episode-seq-banner episode-seq-banner--single"
        role="status"
        aria-live="polite"
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? undefined : { opacity: 0, y: -6 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="episode-seq-banner__glow" aria-hidden />
        <p className="episode-seq-banner__next episode-seq-banner__next--only">
          <span className="episode-seq-banner__arrow" aria-hidden>
            {Glyphs.arrowRight}
          </span>{' '}
          {uiText('episodeFlowNowActive', {
            n: nextN,
            m: totalEpisodes,
            arc: uiText(arcKey)
          })}
        </p>
      </motion.div>
    </AnimatePresence>
  )
}
