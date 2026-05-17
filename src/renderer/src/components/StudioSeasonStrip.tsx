import { motion } from 'framer-motion'
import { useUiText } from '../i18n/useAppI18n'
import { useStudioStore } from '../store/useStudioStore'
import { STUDIO_SEASON_ORDER, STUDIO_SEASON_PRESETS } from '../constants/studioSeasonThemes'

export function StudioSeasonStrip() {
  const uiText = useUiText()
  const studioSeasonId = useStudioStore((s) => s.studioSeasonId)
  const setStudioSeasonId = useStudioStore((s) => s.setStudioSeasonId)

  return (
    <div className="season-strip">
      {STUDIO_SEASON_ORDER.map((id) => (
        <motion.button
          key={id}
          type="button"
          layout
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          className={`season-strip__btn ${studioSeasonId === id ? 'season-strip__btn--active' : ''}`}
          onClick={() => setStudioSeasonId(id)}
          title={uiText(STUDIO_SEASON_PRESETS[id].moodKey)}
        >
          {uiText(STUDIO_SEASON_PRESETS[id].labelKey)}
        </motion.button>
      ))}
    </div>
  )
}
