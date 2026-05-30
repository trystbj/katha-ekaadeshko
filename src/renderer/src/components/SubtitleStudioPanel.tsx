import { useCallback, useMemo, useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import { Glyphs } from '../i18n/uiGlyphs'
import type { StoryScene } from '../types/story'
import type { SubtitleFontCategory, SubtitleStudioState } from '../types/subtitleStudio'
import { SubtitleFreePositionFields } from './SubtitleFreePositionFields'
import { subtitleOffsetsForSceneCount } from '../types/subtitleStudio'
import {
  SUBTITLE_PLAYBACK_PRESETS,
  SUBTITLE_PLAYBACK_PRESET_ORDER,
  type SubtitlePlaybackPresetId
} from '../constants/subtitlePlaybackPresets'
import { subtitlePresetForGenre } from '../utils/subtitleGenreSuggest'
import {
  loadStoredSubtitlePresets,
  persistStoredSubtitlePresets,
  type StoredSubtitleStudioPreset
} from '../utils/subtitlePresetPersistence'
import { useStudioStore } from '../store/useStudioStore'

type Props = {
  scenes: StoryScene[]
  studio: SubtitleStudioState
  patchSubtitleStudio: (patch: Partial<SubtitleStudioState>) => void
}

const FONT_CATS: SubtitleFontCategory[] = [
  'sans',
  'serif',
  'handwritten',
  'cinematic',
  'bold',
  'elegant',
  'playful',
  'traditional',
  'modern',
  'display'
]

function newPresetId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }
}

export function SubtitleStudioPanel({ scenes, studio, patchSubtitleStudio }: Props) {
  const uiText = useUiText()
  const backendGenre = useStudioStore((s) => s.backendGenre)
  const [savedList, setSavedList] = useState<StoredSubtitleStudioPreset[]>(() => loadStoredSubtitlePresets())

  const sceneOffsets = useMemo(() => subtitleOffsetsForSceneCount(studio, scenes.length), [studio, scenes.length])

  const persistList = useCallback((next: StoredSubtitleStudioPreset[]) => {
    setSavedList(next)
    persistStoredSubtitlePresets(next)
  }, [])

  const applyGenrePreset = useCallback(() => {
    const id = subtitlePresetForGenre(backendGenre || '')
    patchSubtitleStudio({ playbackPresetId: id })
  }, [backendGenre, patchSubtitleStudio])

  const saveNamedPreset = useCallback(() => {
    const name = window.prompt(uiText('subtitleStudioSavePrompt'))
    if (!name?.trim()) return
    const entry: StoredSubtitleStudioPreset = {
      id: newPresetId(),
      name: name.trim().slice(0, 80),
      savedAt: new Date().toISOString(),
      studio: { ...studio, dualLinesBySceneIndex: { ...studio.dualLinesBySceneIndex } }
    }
    persistList([entry, ...savedList].slice(0, 40))
  }, [persistList, savedList, studio, uiText])

  const loadNamedPreset = useCallback(
    (entry: StoredSubtitleStudioPreset) => {
      patchSubtitleStudio({
        ...entry.studio,
        advanced: { ...entry.studio.advanced },
        dualLinesBySceneIndex: { ...entry.studio.dualLinesBySceneIndex },
        sceneOffsetsMs: [...entry.studio.sceneOffsetsMs]
      })
    },
    [patchSubtitleStudio]
  )

  const deleteNamedPreset = useCallback(
    (id: string) => {
      persistList(savedList.filter((x) => x.id !== id))
    },
    [persistList, savedList]
  )

  const patchAdv = useCallback(
    (partial: Partial<SubtitleStudioState['advanced']>) => {
      patchSubtitleStudio({ advanced: { ...studio.advanced, ...partial } })
    },
    [patchSubtitleStudio, studio.advanced]
  )

  const applyColorPreset = useCallback(
    (key: string) => {
      switch (key) {
        case 'white_black_outline':
          patchAdv({
            textColor: '#ffffff',
            outlineColor: '#000000',
            outlinePx: 3,
            glowBlurPx: 0,
            shadowBlurPx: 12,
            bgOpacity: 0.35,
            bgColor: '#030712'
          })
          break
        case 'yellow_black_outline':
          patchAdv({
            textColor: '#fef08a',
            outlineColor: '#000000',
            outlinePx: 3,
            glowBlurPx: 0,
            shadowBlurPx: 10,
            bgOpacity: 0.45,
            bgColor: '#0f172a'
          })
          break
        case 'neon_glow':
          patchAdv({
            textColor: '#ecfccb',
            outlineColor: '#14532d',
            outlinePx: 2,
            glowColor: 'rgba(74, 222, 128, 0.85)',
            glowBlurPx: 22,
            shadowBlurPx: 18,
            bgOpacity: 0.5,
            bgColor: '#052e16'
          })
          break
        case 'gold_luxury':
          patchAdv({
            textColor: '#fffbeb',
            outlineColor: '#422006',
            outlinePx: 2,
            glowColor: 'rgba(251, 191, 36, 0.55)',
            glowBlurPx: 16,
            shadowBlurPx: 14,
            bgOpacity: 0.62,
            bgColor: '#1c1917'
          })
          break
        case 'cinematic_soft_white':
          patchAdv({
            textColor: '#f4f4f5',
            outlineColor: '#18181b',
            outlinePx: 1,
            glowBlurPx: 0,
            shadowBlurPx: 20,
            bgOpacity: 0.38,
            bgColor: '#09090b'
          })
          break
        case 'red_dramatic':
          patchAdv({
            textColor: '#fecaca',
            outlineColor: '#450a0a',
            outlinePx: 2,
            glowColor: 'rgba(248, 113, 113, 0.35)',
            glowBlurPx: 14,
            shadowBlurPx: 16,
            bgOpacity: 0.55,
            bgColor: '#1f0505'
          })
          break
        default:
          break
      }
    },
    [patchAdv]
  )

  const adv = studio.advanced

  return (
    <section className="subtitle-studio-panel" aria-label={uiText('subtitleStudioSectionTitle')}>
      <h4 className="post-export-dock__section-title">{uiText('subtitleStudioSectionTitle')}</h4>
      <p className="subtitle-studio-panel__lead">{uiText('subtitleStudioLead')}</p>

      <div className="subtitle-studio-panel__row subtitle-studio-panel__row--toggle">
        <label className="subtitle-studio-panel__check">
          <input
            type="checkbox"
            checked={studio.subtitlesOn}
            onChange={(e) => patchSubtitleStudio({ subtitlesOn: e.target.checked })}
          />
          {uiText('subtitleStudioSubsOn')}
        </label>
        <label className="subtitle-studio-panel__check">
          <input
            type="checkbox"
            checked={studio.burnInExport}
            onChange={(e) => patchSubtitleStudio({ burnInExport: e.target.checked })}
          />
          {uiText('subtitleStudioBurnIn')}
        </label>
        <span className="subtitle-studio-panel__hint">{uiText('subtitleStudioBurnInHint')}</span>
      </div>

      <div className="subtitle-studio-panel__row">
        <span className="subtitle-studio-panel__label">{uiText('subtitleStudioSeparateTrack')}</span>
        <label className="subtitle-studio-panel__inline">
          <input
            type="radio"
            name="capfmt"
            checked={studio.separateTrackFormat === 'vtt'}
            onChange={() => patchSubtitleStudio({ separateTrackFormat: 'vtt' })}
          />
          {uiText('subtitleExportFmtWebvtt')}
        </label>
        <label className="subtitle-studio-panel__inline">
          <input
            type="radio"
            name="capfmt"
            checked={studio.separateTrackFormat === 'srt'}
            onChange={() => patchSubtitleStudio({ separateTrackFormat: 'srt' })}
          />
          {uiText('subtitleExportFmtSrt')}
        </label>
      </div>

      <div className="subtitle-studio-panel__row">
        <label className="post-export-dock__field" style={{ flex: 1, minWidth: 140 }}>
          <span>{uiText('subtitleStudioDelayMs')}</span>
          <input
            type="number"
            className="select"
            step={50}
            value={studio.delayMs}
            onChange={(e) => patchSubtitleStudio({ delayMs: Number(e.target.value) || 0 })}
          />
        </label>
        <label className="subtitle-studio-panel__check tw-mt-6">
          <input
            type="checkbox"
            checked={studio.autoSyncScenes}
            onChange={(e) => patchSubtitleStudio({ autoSyncScenes: e.target.checked })}
          />
          {uiText('subtitleStudioAutoSync')}
        </label>
      </div>

      <div className="subtitle-studio-panel__row">
        <label className="subtitle-studio-panel__check">
          <input
            type="checkbox"
            checked={studio.splitLongLines}
            onChange={(e) => patchSubtitleStudio({ splitLongLines: e.target.checked })}
          />
          {uiText('subtitleStudioSplitLong')}
        </label>
        <label className="post-export-dock__field" style={{ flex: 1, minWidth: 120 }}>
          <span>{uiText('subtitleStudioMaxChars')}</span>
          <input
            type="number"
            className="select"
            min={18}
            max={80}
            value={studio.maxCharsPerLine}
            onChange={(e) =>
              patchSubtitleStudio({ maxCharsPerLine: Math.min(80, Math.max(18, Number(e.target.value) || 42)) })
            }
          />
        </label>
      </div>

      <div className="subtitle-studio-panel__row">
        <label className="post-export-dock__field" style={{ flex: 1 }}>
          <span>{uiText('subtitleStudioKaraoke')}</span>
          <select
            className="select"
            value={studio.karaokeMode}
            onChange={(e) => patchSubtitleStudio({ karaokeMode: e.target.value as SubtitleStudioState['karaokeMode'] })}
          >
            <option value="off">{uiText('subtitleStudioKaraokeOff')}</option>
            <option value="pulse">{uiText('subtitleStudioKaraokePulse')}</option>
          </select>
        </label>
      </div>

      <details className="subtitle-studio-panel__details">
        <summary>{uiText('subtitleStudioStyleLibrary')}</summary>
        <div className="subtitle-studio-panel__preset-grid" role="list">
          {SUBTITLE_PLAYBACK_PRESET_ORDER.map((id: SubtitlePlaybackPresetId) => {
            const preset = SUBTITLE_PLAYBACK_PRESETS[id]
            const active = studio.playbackPresetId === id
            return (
              <button
                key={id}
                type="button"
                role="listitem"
                className={`subtitle-studio-panel__preset-chip${active ? ' subtitle-studio-panel__preset-chip--active' : ''}`}
                onClick={() => patchSubtitleStudio({ playbackPresetId: id })}
              >
                <span className="subtitle-studio-panel__preset-swatch" style={{ background: preset.swatch }} />
                <span>{uiText(preset.labelKey)}</span>
              </button>
            )
          })}
        </div>
        <div className="subtitle-studio-panel__actions">
          <button type="button" className="btn btn-ghost btn-small" onClick={applyGenrePreset}>
            {uiText('subtitleStudioAiGenre')}
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={saveNamedPreset}>
            {uiText('subtitleStudioSaveMyStyle')}
          </button>
        </div>
        {savedList.length ? (
          <ul className="subtitle-studio-panel__saved-list">
            {savedList.map((entry) => (
              <li key={entry.id}>
                <button type="button" className="btn btn-ghost btn-small" onClick={() => loadNamedPreset(entry)}>
                  {entry.name}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  aria-label={uiText('subtitleStudioDeletePreset')}
                  onClick={() => deleteNamedPreset(entry.id)}
                >
                  {Glyphs.multiply}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </details>

      <details className="subtitle-studio-panel__details">
        <summary>{uiText('subtitleStudioPositionMotion')}</summary>
        <SubtitleFreePositionFields
          studio={studio}
          disabled={!studio.subtitlesOn}
          onPatch={patchSubtitleStudio}
          showDragHint
        />
        <label className="post-export-dock__field">
          <span>{uiText('subtitleStudioAnim')}</span>
          <select
            className="select"
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
        <p className="subtitle-studio-panel__hint">{uiText('subtitleStudioNativeAnimHint')}</p>
      </details>

      <details className="subtitle-studio-panel__details">
        <summary>{uiText('subtitleStudioTypography')}</summary>
        <label className="post-export-dock__field">
          <span>{uiText('subtitleStudioFontCategory')}</span>
          <select
            className="select"
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
        <label className="post-export-dock__field">
          <span>{uiText('subtitleStudioFontSize')}</span>
          <input
            type="range"
            min={70}
            max={160}
            value={adv.fontSizePct}
            onChange={(e) => patchAdv({ fontSizePct: Number(e.target.value) })}
          />
          <span className="subtitle-studio-panel__mono">
            {adv.fontSizePct}
            {Glyphs.percent}
          </span>
        </label>
        <label className="post-export-dock__field">
          <span>{uiText('subtitleStudioFontWeight')}</span>
          <input
            type="range"
            min={300}
            max={900}
            step={50}
            value={adv.fontWeight}
            onChange={(e) => patchAdv({ fontWeight: Number(e.target.value) })}
          />
          <span className="subtitle-studio-panel__mono">{adv.fontWeight}</span>
        </label>
        <label className="post-export-dock__field">
          <span>{uiText('subtitleStudioTextTransform')}</span>
          <select
            className="select"
            value={adv.textTransform}
            onChange={(e) =>
              patchAdv({ textTransform: e.target.value as SubtitleStudioState['advanced']['textTransform'] })
            }
          >
            <option value="none">{uiText('textTransform_normal')}</option>
            <option value="uppercase">{uiText('textTransform_uppercase')}</option>
            <option value="lowercase">{uiText('textTransform_lowercase')}</option>
            <option value="capitalize">{uiText('textTransform_capitalize')}</option>
          </select>
        </label>
        <label className="post-export-dock__field">
          <span>{uiText('subtitleStudioLetterSpacing')}</span>
          <input
            type="range"
            min={-5}
            max={20}
            step={1}
            value={Math.round(adv.letterSpacingEm * 100)}
            onChange={(e) => patchAdv({ letterSpacingEm: Number(e.target.value) / 100 })}
          />
        </label>
        <label className="post-export-dock__field">
          <span>{uiText('subtitleStudioLineHeight')}</span>
          <input
            type="range"
            min={110}
            max={200}
            step={5}
            value={Math.round(adv.lineHeight * 100)}
            onChange={(e) => patchAdv({ lineHeight: Number(e.target.value) / 100 })}
          />
        </label>
      </details>

      <details className="subtitle-studio-panel__details">
        <summary>{uiText('subtitleStudioColors')}</summary>
        <div className="subtitle-studio-panel__chip-row">
          {(
            [
              ['white_black_outline', uiText('subtitleStudioCpWhiteBlack')],
              ['yellow_black_outline', uiText('subtitleStudioCpYellowBlack')],
              ['neon_glow', uiText('subtitleStudioCpNeon')],
              ['gold_luxury', uiText('subtitleStudioCpGold')],
              ['cinematic_soft_white', uiText('subtitleStudioCpCinematicSoft')],
              ['red_dramatic', uiText('subtitleStudioCpRed')]
            ] as const
          ).map(([key, label]) => (
            <button key={key} type="button" className="btn btn-ghost btn-small" onClick={() => applyColorPreset(key)}>
              {label}
            </button>
          ))}
        </div>
        <div className="post-export-dock__grid">
          <label className="post-export-dock__field">
            <span>{uiText('subtitleStudioTextColor')}</span>
            <input type="color" value={adv.textColor} onChange={(e) => patchAdv({ textColor: e.target.value })} />
          </label>
          <label className="post-export-dock__field">
            <span>{uiText('subtitleStudioOutlineColor')}</span>
            <input type="color" value={adv.outlineColor} onChange={(e) => patchAdv({ outlineColor: e.target.value })} />
          </label>
          <label className="post-export-dock__field tw-col-span-full">
            <span>{uiText('subtitleStudioGlowColor')}</span>
            <input className="select" value={adv.glowColor} onChange={(e) => patchAdv({ glowColor: e.target.value })} placeholder={uiText('subtitleStudioGlowColorPlaceholder')} />
          </label>
          <label className="post-export-dock__field">
            <span>{uiText('subtitleStudioBgColor')}</span>
            <input type="color" value={adv.bgColor} onChange={(e) => patchAdv({ bgColor: e.target.value })} />
          </label>
          <label className="post-export-dock__field">
            <span>{uiText('subtitleStudioBgOpacity')}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(adv.bgOpacity * 100)}
              onChange={(e) => patchAdv({ bgOpacity: Number(e.target.value) / 100 })}
            />
          </label>
          <label className="subtitle-studio-panel__check tw-mt-4">
            <input
              type="checkbox"
              checked={adv.useGradientText}
              onChange={(e) => patchAdv({ useGradientText: e.target.checked })}
            />
            {uiText('subtitleStudioGradientUi')}
          </label>
          <label className="post-export-dock__field tw-col-span-full">
            <span>{uiText('subtitleStudioGradientCss')}</span>
            <input
              className="select"
              value={adv.gradientCss}
              onChange={(e) => patchAdv({ gradientCss: e.target.value })}
              placeholder={uiText('subtitleStudioGradientCssPlaceholder')}
            />
          </label>
        </div>
      </details>

      <details className="subtitle-studio-panel__details">
        <summary>{uiText('subtitleStudioEffects')}</summary>
        <label className="post-export-dock__field">
          <span>{uiText('subtitleStudioOutlinePx')}</span>
          <input
            type="range"
            min={0}
            max={6}
            value={adv.outlinePx}
            onChange={(e) => patchAdv({ outlinePx: Number(e.target.value) })}
          />
        </label>
        <label className="post-export-dock__field">
          <span>{uiText('subtitleStudioShadowBlur')}</span>
          <input
            type="range"
            min={0}
            max={40}
            value={adv.shadowBlurPx}
            onChange={(e) => patchAdv({ shadowBlurPx: Number(e.target.value) })}
          />
        </label>
        <label className="post-export-dock__field">
          <span>{uiText('subtitleStudioGlowBlur')}</span>
          <input
            type="range"
            min={0}
            max={48}
            value={adv.glowBlurPx}
            onChange={(e) => patchAdv({ glowBlurPx: Number(e.target.value) })}
          />
        </label>
        <label className="post-export-dock__field">
          <span>{uiText('subtitleStudioRoundedBox')}</span>
          <input
            type="range"
            min={0}
            max={28}
            value={adv.roundedBoxPx}
            onChange={(e) => patchAdv({ roundedBoxPx: Number(e.target.value) })}
          />
        </label>
        <label className="post-export-dock__field">
          <span>{uiText('subtitleStudioBackdropBlur')}</span>
          <input
            type="range"
            min={0}
            max={24}
            value={adv.backdropBlurPx}
            onChange={(e) => patchAdv({ backdropBlurPx: Number(e.target.value) })}
          />
        </label>
      </details>

      <details className="subtitle-studio-panel__details">
        <summary>{uiText('subtitleStudioDualLang')}</summary>
        <label className="subtitle-studio-panel__check">
          <input
            type="checkbox"
            checked={studio.dualLangEnabled}
            onChange={(e) => patchSubtitleStudio({ dualLangEnabled: e.target.checked })}
          />
          {uiText('subtitleStudioDualEnable')}
        </label>
        <p className="subtitle-studio-panel__hint">{uiText('subtitleStudioDualHint')}</p>
        <label className="post-export-dock__field">
          <span>{uiText('subtitleStudioSecondaryLang')}</span>
          <select
            className="select"
            value={studio.dualLangCode}
            onChange={(e) => patchSubtitleStudio({ dualLangCode: e.target.value })}
          >
            <option value="ne">{uiText('subtitleDualLangOpt_ne')}</option>
            <option value="en">{uiText('subtitleDualLangOpt_en')}</option>
            <option value="hi">{uiText('subtitleDualLangOpt_hi')}</option>
          </select>
        </label>
        {studio.dualLangEnabled ? (
          <div className="subtitle-studio-panel__dual-grid">
            {scenes.slice(0, 14).map((sc, i) => (
              <label key={`${sc.index}-${i}`} className="post-export-dock__field">
                <span>
                  {uiText('subtitleStudioSceneLine', { n: i + 1 })}
                </span>
                <input
                  className="select"
                  placeholder={uiText('subtitleStudioSecondaryPh')}
                  value={studio.dualLinesBySceneIndex[i] ?? ''}
                  onChange={(e) =>
                    patchSubtitleStudio({
                      dualLinesBySceneIndex: { ...studio.dualLinesBySceneIndex, [i]: e.target.value }
                    })
                  }
                />
              </label>
            ))}
          </div>
        ) : null}
      </details>

      <details className="subtitle-studio-panel__details">
        <summary>{uiText('subtitleStudioManualOffsets')}</summary>
        <p className="subtitle-studio-panel__hint">{uiText('subtitleStudioOffsetsHint')}</p>
        <div className="subtitle-studio-panel__offsets-grid">
          {scenes.slice(0, 24).map((sc, i) => (
            <label key={`off-${sc.index}-${i}`} className="post-export-dock__field">
              <span>{uiText('subtitleStudioOffsetSceneAbbr', { n: i + 1 })}</span>
              <input
                type="number"
                className="select"
                step={50}
                value={sceneOffsets[i] ?? 0}
                onChange={(e) => {
                  const next = sceneOffsets.slice()
                  next[i] = Number(e.target.value) || 0
                  patchSubtitleStudio({ sceneOffsetsMs: next })
                }}
              />
            </label>
          ))}
        </div>
      </details>

      <details className="subtitle-studio-panel__details">
        <summary>{uiText('subtitleStudioTemplatesSocial')}</summary>
        <div className="subtitle-studio-panel__chip-row">
          <button type="button" className="btn btn-ghost btn-small" onClick={() => patchSubtitleStudio({ playbackPresetId: 'viral_reel' })}>
            {uiText('subtitleTplReel')}
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => patchSubtitleStudio({ playbackPresetId: 'tiktok_pop' })}>
            {uiText('subtitleTplTiktok')}
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => patchSubtitleStudio({ playbackPresetId: 'youtube_shorts_caption' })}>
            {uiText('subtitleTplShorts')}
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => patchSubtitleStudio({ playbackPresetId: 'karaoke_highlight', karaokeMode: 'pulse' })}>
            {uiText('subtitleTplKaraoke')}
          </button>
        </div>
      </details>
    </section>
  )
}
