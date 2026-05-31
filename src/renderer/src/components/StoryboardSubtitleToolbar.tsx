import { useUiText } from '../i18n/useAppI18n'
import type { SubtitleStudioState, SubtitleFontCategory } from '../types/subtitleStudio'

const FONT_CATS: SubtitleFontCategory[] = [
  'elegant',
  'serif',
  'sans',
  'cinematic',
  'bold',
  'handwritten',
  'playful',
  'traditional',
  'modern',
  'display'
]

type Props = {
  studio: SubtitleStudioState
  disabled?: boolean
  onPatch: (patch: Partial<SubtitleStudioState>) => void
  /** Transparent controls overlaid on the preview image. */
  overlayOnStage?: boolean
}

/** Minimal subtitle rail — size/position via on-image handles only. */
export function StoryboardSubtitleToolbar({
  studio,
  disabled = false,
  onPatch,
  overlayOnStage = false
}: Props) {
  const uiText = useUiText()
  const adv = studio.advanced
  const off = disabled || !studio.subtitlesOn

  const patchAdv = (partial: Partial<SubtitleStudioState['advanced']>) => {
    onPatch({ advanced: { ...adv, ...partial } })
  }

  return (
    <div
      className={`storyboard-subtitle-rail storyboard-subtitle-rail--minimal${overlayOnStage ? ' storyboard-subtitle-rail--overlay' : ''}`}
      role="region"
      aria-label={uiText('storyboardSubtitleRailAria')}
    >
      <label className="storyboard-subtitle-rail__toggle">
        <input
          type="checkbox"
          checked={studio.subtitlesOn}
          disabled={disabled}
          onChange={(e) => onPatch({ subtitlesOn: e.target.checked })}
        />
        <span>{uiText('storyboardSubtitlesOn')}</span>
      </label>

      <label className="storyboard-subtitle-rail__field">
        <span className="sr-only">{uiText('subtitleStudioFontCategory')}</span>
        <select
          className="select storyboard-subtitle-rail__select"
          disabled={off}
          value={adv.fontCategory}
          onChange={(e) => patchAdv({ fontCategory: e.target.value as SubtitleFontCategory })}
          aria-label={uiText('subtitleStudioFontCategory')}
        >
          {FONT_CATS.map((fc) => (
            <option key={fc} value={fc}>
              {uiText(`subtitleStudioFont_${fc}`)}
            </option>
          ))}
        </select>
      </label>

      <div className="storyboard-subtitle-rail__toggles" role="group" aria-label={uiText('subtitleToolbarStyle')}>
        <button
          type="button"
          className={`storyboard-subtitle-rail__icon-btn${adv.fontWeight >= 700 ? ' storyboard-subtitle-rail__icon-btn--on' : ''}`}
          disabled={off}
          onClick={() => patchAdv({ fontWeight: adv.fontWeight >= 700 ? 400 : 700 })}
          aria-pressed={adv.fontWeight >= 700}
        >
          B
        </button>
        <button
          type="button"
          className={`storyboard-subtitle-rail__icon-btn${adv.fontStyle === 'italic' ? ' storyboard-subtitle-rail__icon-btn--on' : ''}`}
          disabled={off}
          onClick={() => patchAdv({ fontStyle: adv.fontStyle === 'italic' ? 'normal' : 'italic' })}
          aria-pressed={adv.fontStyle === 'italic'}
        >
          I
        </button>
      </div>

      <label className="storyboard-subtitle-rail__field storyboard-subtitle-rail__field--opacity">
        <span>{uiText('subtitleStudioOpacity')}</span>
        <input
          type="range"
          min={0}
          max={100}
          disabled={off}
          value={Math.round(adv.bgOpacity * 100)}
          onChange={(e) => patchAdv({ bgOpacity: Number(e.target.value) / 100 })}
        />
        <span className="storyboard-subtitle-rail__opacity-val">{Math.round(adv.bgOpacity * 100)}%</span>
      </label>
    </div>
  )
}
