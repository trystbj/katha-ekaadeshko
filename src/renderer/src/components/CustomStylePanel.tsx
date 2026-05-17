import { motion } from 'framer-motion'
import { useCallback, useMemo, type KeyboardEvent } from 'react'
import {
  CUSTOM_STYLE_PLACEHOLDER_EXAMPLES,
  inferCustomStyleMoodPreview
} from '../utils/customStyleCompose'
import { useUiText } from '../i18n/useAppI18n'
import { useRotatingPlaceholder } from '../hooks/useRotatingPlaceholder'
import { useStudioStore } from '../store/useStudioStore'

const PANEL_VARIANTS = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] as const }
  }
}

export function CustomStylePanel() {
  const uiText = useUiText()
  const description = useStudioStore((s) => s.customStyleDescription)
  const recentCustomStyles = useStudioStore((s) => s.recentCustomStyles)
  const setCustomStyleFields = useStudioStore((s) => s.setCustomStyleFields)
  const applyRecentCustomStyle = useStudioStore((s) => s.applyRecentCustomStyle)
  const dismissCustomStyleOverlay = useStudioStore((s) => s.dismissCustomStyleOverlay)

  const placeholderKey = useRotatingPlaceholder(CUSTOM_STYLE_PLACEHOLDER_EXAMPLES)
  const placeholder = uiText(placeholderKey)

  const moodPreview = useMemo(() => inferCustomStyleMoodPreview(description), [description])
  const canConfirm = description.trim().length > 0

  const confirmOverlay = useCallback(() => {
    if (!description.trim()) return
    dismissCustomStyleOverlay()
  }, [description, dismissCustomStyleOverlay])

  const onTextareaKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey) return
    e.preventDefault()
    confirmOverlay()
  }

  const onRecentSelect = (text: string) => {
    applyRecentCustomStyle(text)
    if (text.trim()) dismissCustomStyleOverlay()
  }

  return (
    <motion.div
      className="cinematic-custom-style"
      data-mood-preview={moodPreview}
      variants={PANEL_VARIANTS}
      initial="hidden"
      animate="visible"
      role="region"
      aria-label={uiText('customStylePanelAria')}
    >
      <motion.div className="cinematic-custom-style__ambience" aria-hidden>
        <span className="cinematic-custom-style__particle cinematic-custom-style__particle--a" />
        <span className="cinematic-custom-style__particle cinematic-custom-style__particle--b" />
        <span className="cinematic-custom-style__particle cinematic-custom-style__particle--c" />
        <span className="cinematic-custom-style__glow" />
      </motion.div>

      <motion.div className="cinematic-custom-style__head">
        <span className="cinematic-custom-style__badge">{uiText('customStyleAiDirector')}</span>
        <p className="cinematic-custom-style__lead">{uiText('customStylePanelLead')}</p>
      </motion.div>

      <motion.div className="cinematic-custom-style__field-wrap">
        <label className="cinematic-custom-style__label" htmlFor="studio-custom-visual-prompt">
          {uiText('customStyleDescribeLabel')}
        </label>
        <textarea
          id="studio-custom-visual-prompt"
          className="cinematic-custom-style__textarea"
          maxLength={720}
          rows={2}
          autoComplete="off"
          value={description}
          placeholder={placeholder}
          onChange={(e) => setCustomStyleFields({ description: e.target.value })}
          onKeyDown={onTextareaKeyDown}
        />
      </motion.div>

      {recentCustomStyles.length > 0 ? (
        <motion.div className="cinematic-custom-style__recent">
          <motion.div className="cinematic-custom-style__mini-label">{uiText('customStyleRecentGenerated')}</motion.div>
          <div className="cinematic-custom-style__chips-scroll studio-mock-scroll--hide-bar">
            {recentCustomStyles.map((entry) => (
              <button
                key={`recent:${entry.savedAt}:${entry.text.slice(0, 48)}`}
                type="button"
                className="cinematic-custom-style__chip cinematic-custom-style__chip--recent"
                title={entry.text}
                onClick={() => onRecentSelect(entry.text)}
              >
                {entry.text.length > 40 ? `${entry.text.slice(0, 38)}…` : entry.text}
              </button>
            ))}
          </div>
        </motion.div>
      ) : null}

      <div className="cinematic-custom-style__actions">
        <button
          type="button"
          className="cinematic-custom-style__confirm"
          disabled={!canConfirm}
          onClick={confirmOverlay}
        >
          {uiText('customStyleConfirmOk')}
        </button>
      </div>
    </motion.div>
  )
}
