import { useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import type { SubtitleStudioState } from '../types/subtitleStudio'
import { StoryboardCcSettingsPanel } from './StoryboardCcSettingsPanel'

type Props = {
  studio: SubtitleStudioState
  disabled?: boolean
  onPatch: (patch: Partial<SubtitleStudioState>) => void
}

/** Preview dock: CC on/off + expandable settings (no style controls on the stage). */
export function StoryboardSubtitleToolbar({ studio, disabled = false, onPatch }: Props) {
  const uiText = useUiText()
  const [ccOpen, setCcOpen] = useState(true)

  return (
    <div className="storyboard-subtitle-toolbar">
      <label className="storyboard-subtitle-toolbar__toggle">
        <input
          type="checkbox"
          checked={studio.subtitlesOn}
          disabled={disabled}
          onChange={(e) => onPatch({ subtitlesOn: e.target.checked })}
        />
        {studio.subtitlesOn ? uiText('storyboardSubtitlesOn') : uiText('storyboardSubtitlesOff')}
      </label>
      <button
        type="button"
        className="btn btn-ghost btn-small storyboard-subtitle-toolbar__cc-btn"
        disabled={disabled}
        aria-expanded={ccOpen}
        onClick={() => setCcOpen((o) => !o)}
      >
        {ccOpen ? uiText('storyboardCcHide') : uiText('storyboardCcShow')}
      </button>
      {ccOpen ? (
        <StoryboardCcSettingsPanel studio={studio} disabled={disabled} onPatch={onPatch} />
      ) : null}
    </div>
  )
}
