import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { STYLE_WIREFRAME_LABEL_KEY } from '../constants/styleWireframeOrder'
import { useUiText } from '../i18n/useAppI18n'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { resolveVisualStyleId } from '../utils/styleIdMigration'
import { STYLE_PRESETS, type VisualStyleId } from '../types/story'

type Props = {
  styleId: VisualStyleId | ''
  previewUrl?: string
  busy?: boolean
}

const DEMO_LINES = [
  'cinematicStylePreviewSubtitle',
  'cinematicStylePreviewDialog',
  'cinematicStylePreviewNarration'
] as const

export function CinematicStylePreviewPlayer({ styleId, previewUrl, busy }: Props) {
  const uiText = useUiText()
  const reduced = usePrefersReducedMotion()
  const [lineIx, setLineIx] = useState(0)

  const resolvedId = resolveVisualStyleId(styleId)
  const preset = STYLE_PRESETS[resolvedId]
  const label = uiText(STYLE_WIREFRAME_LABEL_KEY[resolvedId])
  const bg = previewUrl || preset.previewImageUrl

  useEffect(() => {
    if (reduced) return
    const t = window.setInterval(() => setLineIx((i) => (i + 1) % DEMO_LINES.length), 4200)
    return () => window.clearInterval(t)
  }, [reduced, resolvedId])

  const particles = useMemo(
    () =>
      Array.from({ length: reduced ? 0 : 6 }, (_, i) => ({
        id: i,
        left: `${8 + ((i * 17) % 84)}%`,
        delay: (i % 5) * 0.7,
        dur: 5 + (i % 4)
      })),
    [reduced]
  )

  return (
    <div
      className={`cinematic-style-preview cinematic-style-preview--${resolvedId}${busy ? ' cinematic-style-preview--busy' : ''}`}
    >
      <motion.div
        className="cinematic-style-preview__frame"
        key={bg}
        style={{
          backgroundImage: `${preset.previewGradient}, url(${bg})`
        }}
        whileHover={reduced ? undefined : { scale: 1.01 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      >
        {!reduced ? (
          <>
            <div className="cinematic-style-preview__glow" aria-hidden />
            <motion.div
              className="cinematic-style-preview__scan"
              aria-hidden
              animate={{ y: ['-8%', '108%'] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div className="cinematic-style-preview__vignette" aria-hidden />
            {particles.map((p) => (
              <motion.span
                key={p.id}
                className="cinematic-style-preview__particle"
                style={{ left: p.left }}
                aria-hidden
                animate={{ y: [0, -20, 0], opacity: [0.2, 0.5, 0.15] }}
                transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
              />
            ))}
          </>
        ) : (
          <div className="cinematic-style-preview__vignette" aria-hidden />
        )}
        <div className="cinematic-style-preview__badge">{label}</div>
        <div className="cinematic-style-preview__stack">
          <motion.p
            key={lineIx}
            className="cinematic-style-preview__subtitle"
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {uiText(DEMO_LINES[lineIx])}
          </motion.p>
          <p className="cinematic-style-preview__meta">{uiText('cinematicStylePreviewAmbience')}</p>
        </div>
        {busy ? (
          <motion.div className="cinematic-style-preview__director" role="status">
            {uiText('cinematicStylePreviewDirector')}
          </motion.div>
        ) : null}
      </motion.div>
      <p className="cinematic-style-preview__caption">{uiText('cinematicStylePreviewTitle')}</p>
    </div>
  )
}
