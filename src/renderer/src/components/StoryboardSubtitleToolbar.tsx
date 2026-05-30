import { useUiText } from '../i18n/useAppI18n'
import type { SubtitleStudioState, SubtitleFontCategory } from '../types/subtitleStudio'
import { SubtitleFreePositionFields } from './SubtitleFreePositionFields'
import {
  SUBTITLE_PLAYBACK_PRESETS,
  SUBTITLE_PLAYBACK_PRESET_ORDER,
  isSubtitlePlaybackPresetId,
  type SubtitlePlaybackPresetId
} from '../constants/subtitlePlaybackPresets'

const FONT_CATS: SubtitleFontCategory[] = [
  'sans',
  'serif',
  'cinematic',
  'elegant',
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

export function StoryboardSubtitleToolbar({ studio, disabled = false, onPatch }: Props) {
  const uiText = useUiText()
  const adv = studio.advanced

  const patchAdv = (partial: Partial<SubtitleStudioState['advanced']>) => {
    onPatch({ advanced: { ...adv, ...partial } })
  }

  const setPreset = (id: SubtitlePlaybackPresetId) => {
    onPatch({ playbackPresetId: id })
  }

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

      <label className="storyboard-subtitle-toolbar__field">
        <span>{uiText('subtitleStudioFontCategory')}</span>
        <select
          className="select"
          disabled={disabled || !studio.subtitlesOn}
          value={adv.fontCategory}
          onChange={(e) => patchAdv({ fontCategory: e.target.value as SubtitleFontCategory })}
        >
          {FONT_CATS.map((fc) => (
            <option key={fc} value={fc}>
              {uiText(`subtitleStudioFont_${fc}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="storyboard-subtitle-toolbar__field">
        <span>{uiText('storyboardSubtitleSize')}</span>
        <input
          type="range"
          min={70}
          max={160}
          disabled={disabled || !studio.subtitlesOn}
          value={adv.fontSizePct}
          onChange={(e) => patchAdv({ fontSizePct: Number(e.target.value) })}
        />
      </label>

      <label className="storyboard-subtitle-toolbar__field">
        <span>{uiText('subtitleStudioFontWeight')}</span>
        <select
          className="select"
          disabled={disabled || !studio.subtitlesOn}
          value={adv.fontWeight}
          onChange={(e) => patchAdv({ fontWeight: Number(e.target.value) })}
        >
          <option value={400}>400</option>
          <option value={600}>600</option>
          <option value={700}>700</option>
          <option value={800}>800</option>
        </select>
      </label>

      <div className="storyboard-subtitle-toolbar__style-toggles">
        <button
          type="button"
          className={`btn btn-ghost btn-small${adv.fontWeight >= 700 ? ' storyboard-subtitle-toolbar__btn--on' : ''}`}
          disabled={disabled || !studio.subtitlesOn}
          onClick={() => patchAdv({ fontWeight: adv.fontWeight >= 700 ? 400 : 700 })}
        >
          {uiText('subtitleToolbarBold')}
        </button>
        <button
          type="button"
          className={`btn btn-ghost btn-small${adv.fontStyle === 'italic' ? ' storyboard-subtitle-toolbar__btn--on' : ''}`}
          disabled={disabled || !studio.subtitlesOn}
          onClick={() => patchAdv({ fontStyle: adv.fontStyle === 'italic' ? 'normal' : 'italic' })}
        >
          {uiText('subtitleToolbarItalic')}
        </button>
      </div>

      <div className="storyboard-subtitle-toolbar__align" role="group" aria-label={uiText('subtitleToolbarAlign')}>
        {(['start', 'center', 'end'] as const).map((align) => (
          <button
            key={align}
            type="button"
            className={`btn btn-ghost btn-small${(adv.textAlign ?? 'center') === align ? ' storyboard-subtitle-toolbar__btn--on' : ''}`}
            disabled={disabled || !studio.subtitlesOn}
            onClick={() => patchAdv({ textAlign: align })}
          >
            {align === 'start' ? uiText('subtitleToolbarAlignLeft') : align === 'end' ? uiText('subtitleToolbarAlignRight') : uiText('subtitleToolbarAlignCenter')}
          </button>
        ))}
      </div>

      <label className="storyboard-subtitle-toolbar__field">
        <span>{uiText('storyboardSubtitleColor')}</span>
        <input
          type="color"
          disabled={disabled || !studio.subtitlesOn}
          value={adv.textColor}
          onChange={(e) => patchAdv({ textColor: e.target.value })}
        />
      </label>

      <label className="storyboard-subtitle-toolbar__field">
        <span>{uiText('subtitleStudioOpacity')}</span>
        <input
          type="range"
          min={0}
          max={100}
          disabled={disabled || !studio.subtitlesOn}
          value={Math.round(adv.bgOpacity * 100)}
          onChange={(e) => patchAdv({ bgOpacity: Number(e.target.value) / 100 })}
        />
      </label>

      <select
        className="select storyboard-subtitle-toolbar__preset"
        value={studio.playbackPresetId}
        disabled={disabled || !studio.subtitlesOn}
        onChange={(e) => {
          const v = e.target.value
          if (isSubtitlePlaybackPresetId(v)) setPreset(v)
        }}
        aria-label={uiText('storyboardSubtitleStyle')}
      >
        {SUBTITLE_PLAYBACK_PRESET_ORDER.map((id) => (
          <option key={id} value={id}>
            {uiText(SUBTITLE_PLAYBACK_PRESETS[id].labelKey)}
          </option>
        ))}
      </select>

      <SubtitleFreePositionFields
        className="storyboard-subtitle-toolbar__position"
        studio={studio}
        disabled={disabled || !studio.subtitlesOn}
        onPatch={onPatch}
        showDragHint
      />
    </div>
  )
}
