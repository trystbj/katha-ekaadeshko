import { motion } from 'framer-motion'
import { useUiText } from '../i18n/useAppI18n'
import { Glyphs } from '../i18n/uiGlyphs'
import {
  VISUAL_THEME_PACKS,
  defaultPackForStyle,
  packIdsForCategory,
  type VisualThemePackCategory,
  type VisualThemePackId
} from '../constants/visualThemePacks'
import { recommendStyleFromIdea } from '../prompts/storyEngine'
import { useStudioStore } from '../store/useStudioStore'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { StudioStyleLabelIcon } from './StudioStyleLabelIcon'

type Props = {
  idea: string
}

const CATEGORY_ORDER: VisualThemePackCategory[] = ['seasons', 'nature', 'style_packs']

export function StudioStyleExplorer({ idea }: Props) {
  const uiText = useUiText()
  const reduced = usePrefersReducedMotion()
  const visualPackId = useStudioStore((s) => s.visualPackId)
  const setVisualPackId = useStudioStore((s) => s.setVisualPackId)
  const setStyleId = useStudioStore((s) => s.setStyleId)
  const setStudioSeasonId = useStudioStore((s) => s.setStudioSeasonId)

  const pickPack = (id: VisualThemePackId) => {
    const pack = VISUAL_THEME_PACKS[id]
    setVisualPackId(id)
    setStyleId(pack.mapsToStyleId)
    if (pack.studioSeasonId) setStudioSeasonId(pack.studioSeasonId)
  }

  const onRecommend = () => {
    const sid = recommendStyleFromIdea(idea)
    setStyleId(sid)
    setVisualPackId(defaultPackForStyle(sid))
  }

  const catLabel = (c: VisualThemePackCategory) => {
    if (c === 'seasons') return uiText('styleCategorySeasons')
    if (c === 'nature') return uiText('styleCategoryNature')
    return uiText('styleCategoryStylePacks')
  }

  return (
    <div className="studio-style-explorer">
      <div className="studio-mock-style-head">
        <span className="studio-mock-style-spark" aria-hidden>
          <StudioStyleLabelIcon />
        </span>
        <h3>{uiText('style')}</h3>
      </div>
      <p className="style-hint tw-text-[0.82rem] tw-text-white/55 tw-mb-3 tw-mt-0">{uiText('styleImageHint')}</p>

      <div className="studio-style-explorer__scroll">
        {CATEGORY_ORDER.map((cat) => (
          <section key={cat} className="studio-style-explorer__section">
            <h4 className="studio-style-explorer__cat">{catLabel(cat)}</h4>
            <div className="studio-style-explorer__grid">
              {packIdsForCategory(cat).map((id) => {
                const pack = VISUAL_THEME_PACKS[id]
                const selected = visualPackId === id
                return (
                  <motion.button
                    key={id}
                    type="button"
                    className={`studio-pack-card ${selected ? 'studio-pack-card--selected' : ''}`}
                    style={{
                      backgroundImage: `${pack.previewGradient}, url(${pack.previewImageUrl})`
                    }}
                    onClick={() => pickPack(id)}
                    whileHover={
                      reduced
                        ? undefined
                        : {
                            scale: 1.035,
                            rotateY: -4,
                            rotateX: 2,
                            transition: { type: 'spring', stiffness: 420, damping: 28 }
                          }
                    }
                    whileTap={reduced ? undefined : { scale: 0.98 }}
                    layout={!reduced}
                  >
                    <motion.span
                      className="studio-pack-card__shimmer"
                      aria-hidden
                      animate={
                        reduced
                          ? undefined
                          : {
                              opacity: [0.15, 0.45, 0.15],
                              x: ['-30%', '130%']
                            }
                      }
                      transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <span className="studio-pack-card__label">{uiText(pack.labelKey)}</span>
                    <span className="studio-pack-card__meta">{uiText(pack.moodKey)}</span>
                  </motion.button>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <button type="button" className="btn btn-ghost btn-small studio-mock-rec-btn" onClick={onRecommend}>
        <span aria-hidden>{Glyphs.bulb}</span> {uiText('recommendStyle')}
      </button>
    </div>
  )
}
