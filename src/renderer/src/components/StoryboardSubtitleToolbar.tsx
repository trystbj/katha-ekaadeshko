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
}

function displaySizePx(fontSizePct: number): number {
  return Math.round(24 + ((fontSizePct - 70) / 90) * 28)
}

function fontSizePctFromDisplay(px: number): number {
  return Math.min(160, Math.max(70, Math.round(70 + ((px - 24) / 28) * 90)))
}

/** Reference-style subtitle controls — always below preview, never over the image. */
export function StoryboardSubtitleToolbar({ studio, disabled = false, onPatch }: Props) {
  const uiText = useUiText()
  const adv = studio.advanced
  const off = disabled || !studio.subtitlesOn

  const patchAdv = (partial: Partial<SubtitleStudioState['advanced']>) => {
    onPatch({ advanced: { ...adv, ...partial } })
  }

  const sizePx = displaySizePx(adv.fontSizePct)

  return (
    <div className="storyboard-subtitle-rail" role="region" aria-label={uiText('storyboardSubtitleRailAria')}>
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

      <label className="storyboard-subtitle-rail__field storyboard-subtitle-rail__field--size">
        <span className="sr-only">{uiText('storyboardSubtitleSize')}</span>
        <input
          type="number"
          className="storyboard-subtitle-rail__size-input"
          min={24}
          max={64}
          disabled={off}
          value={sizePx}
          onChange={(e) => patchAdv({ fontSizePct: fontSizePctFromDisplay(Number(e.target.value)) })}
          aria-label={uiText('storyboardSubtitleSize')}
        />
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

      <div className="storyboard-subtitle-rail__align" role="group" aria-label={uiText('subtitleToolbarAlign')}>
        {(['start', 'center', 'end'] as const).map((align) => (
          <button
            key={align}
            type="button"
            className={`storyboard-subtitle-rail__icon-btn${(adv.textAlign ?? 'center') === align ? ' storyboard-subtitle-rail__icon-btn--on' : ''}`}
            disabled={off}
            onClick={() => patchAdv({ textAlign: align })}
            aria-pressed={(adv.textAlign ?? 'center') === align}
          >
            {align === 'start' ? '≡' : align === 'end' ? '≣' : '≡'}
          </button>
        ))}
      </div>

      <label className="storyboard-subtitle-rail__field storyboard-subtitle-rail__field--color">
        <span className="sr-only">{uiText('storyboardSubtitleColor')}</span>
        <input
          type="color"
          className="storyboard-subtitle-rail__color"
          disabled={off}
          value={adv.textColor}
          onChange={(e) => patchAdv({ textColor: e.target.value })}
        />
      </label>

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
