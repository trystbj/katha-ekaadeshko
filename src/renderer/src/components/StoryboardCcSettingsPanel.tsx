import { useUiText } from '../i18n/useAppI18n'
import type { SubtitleStudioState, SubtitleFontCategory } from '../types/subtitleStudio'
import {
  SUBTITLE_PLAYBACK_PRESETS,
  SUBTITLE_PLAYBACK_PRESET_ORDER,
  isSubtitlePlaybackPresetId,
  type SubtitlePlaybackPresetId
} from '../constants/subtitlePlaybackPresets'
import { subtitleStudioPatchForPlaybackPreset } from '../utils/subtitlePlaybackPresetApply'

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

/** CC / caption styling — lives outside the preview stage (storyboard dock). */
export function StoryboardCcSettingsPanel({ studio, disabled = false, onPatch }: Props) {
  const uiText = useUiText()
  const adv = studio.advanced

  const patchAdv = (partial: Partial<SubtitleStudioState['advanced']>) => {
    onPatch({ advanced: { ...adv, ...partial } })
  }

  const setPreset = (id: SubtitlePlaybackPresetId) => {
    onPatch(subtitleStudioPatchForPlaybackPreset(studio, id))
  }

  const off = disabled || !studio.subtitlesOn

  return (
    <div className="storyboard-cc-settings">
      <label className="storyboard-cc-settings__field">
        <span>{uiText('subtitleStudioFontCategory')}</span>
        <select
          className="select"
          disabled={off}
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

      <label className="storyboard-cc-settings__field">
        <span>{uiText('storyboardSubtitleSize')}</span>
        <input
          type="range"
          min={70}
          max={160}
          disabled={off}
          value={adv.fontSizePct}
          onChange={(e) => patchAdv({ fontSizePct: Number(e.target.value) })}
        />
      </label>

      <label className="storyboard-cc-settings__field">
        <span>{uiText('subtitleStudioFontWeight')}</span>
        <select
          className="select"
          disabled={off}
          value={adv.fontWeight}
          onChange={(e) => patchAdv({ fontWeight: Number(e.target.value) })}
        >
          <option value={400}>400</option>
          <option value={600}>600</option>
          <option value={700}>700</option>
          <option value={800}>800</option>
        </select>
      </label>

      <div className="storyboard-cc-settings__toggles">
        <button
          type="button"
          className={`btn btn-ghost btn-small${adv.fontWeight >= 700 ? ' storyboard-cc-settings__btn--on' : ''}`}
          disabled={off}
          onClick={() => patchAdv({ fontWeight: adv.fontWeight >= 700 ? 400 : 700 })}
        >
          {uiText('subtitleToolbarBold')}
        </button>
        <button
          type="button"
          className={`btn btn-ghost btn-small${adv.fontStyle === 'italic' ? ' storyboard-cc-settings__btn--on' : ''}`}
          disabled={off}
          onClick={() => patchAdv({ fontStyle: adv.fontStyle === 'italic' ? 'normal' : 'italic' })}
        >
          {uiText('subtitleToolbarItalic')}
        </button>
      </div>

      <div className="storyboard-cc-settings__align" role="group" aria-label={uiText('subtitleToolbarAlign')}>
        {(['start', 'center', 'end'] as const).map((align) => (
          <button
            key={align}
            type="button"
            className={`btn btn-ghost btn-small${(adv.textAlign ?? 'center') === align ? ' storyboard-cc-settings__btn--on' : ''}`}
            disabled={off}
            onClick={() => patchAdv({ textAlign: align })}
          >
            {align === 'start'
              ? uiText('subtitleToolbarAlignLeft')
              : align === 'end'
                ? uiText('subtitleToolbarAlignRight')
                : uiText('subtitleToolbarAlignCenter')}
          </button>
        ))}
      </div>

      <label className="storyboard-cc-settings__field">
        <span>{uiText('storyboardSubtitleColor')}</span>
        <input type="color" disabled={off} value={adv.textColor} onChange={(e) => patchAdv({ textColor: e.target.value })} />
      </label>

      <label className="storyboard-cc-settings__field">
        <span>{uiText('subtitleStudioOutlinePx')}</span>
        <input
          type="range"
          min={0}
          max={6}
          disabled={off}
          value={adv.outlinePx}
          onChange={(e) => patchAdv({ outlinePx: Number(e.target.value) })}
        />
      </label>

      <label className="storyboard-cc-settings__field">
        <span>{uiText('subtitleStudioShadowBlur')}</span>
        <input
          type="range"
          min={0}
          max={12}
          disabled={off}
          value={adv.shadowBlurPx}
          onChange={(e) => patchAdv({ shadowBlurPx: Number(e.target.value) })}
        />
      </label>

      <label className="storyboard-cc-settings__field">
        <span>{uiText('subtitleStudioOpacity')}</span>
        <input
          type="range"
          min={0}
          max={100}
          disabled={off}
          value={Math.round(adv.bgOpacity * 100)}
          onChange={(e) => patchAdv({ bgOpacity: Number(e.target.value) / 100 })}
        />
      </label>

      <label className="storyboard-cc-settings__field">
        <span>{uiText('subtitleStudioAnim')}</span>
        <select
          className="select"
          disabled={off}
          value={adv.animation}
          onChange={(e) =>
            patchAdv({ animation: e.target.value as SubtitleStudioState['advanced']['animation'] })
          }
        >
          <option value="none">{uiText('subtitleStudioAnimNone')}</option>
          <option value="fade_in">{uiText('subtitleStudioAnimFade')}</option>
          <option value="bounce">{uiText('subtitleStudioAnimBounce')}</option>
          <option value="slide">{uiText('subtitleStudioAnimSlide')}</option>
          <option value="typewriter">{uiText('subtitleStudioAnimTypewriter')}</option>
        </select>
      </label>

      <select
        className="select storyboard-cc-settings__preset"
        value={studio.playbackPresetId}
        disabled={off}
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

      <p className="storyboard-cc-settings__hint">{uiText('storyboardCcDragHint')}</p>
    </div>
  )
}
