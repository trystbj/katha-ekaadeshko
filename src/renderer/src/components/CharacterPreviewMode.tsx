import { useUiText } from '../i18n/useAppI18n'
import { Glyphs } from '../i18n/uiGlyphs'
import type { StoryCharacter } from '../types/story'
import { NARRATOR_UI_PRESETS } from '../constants/narrators'
import { normalizeNarratorId } from '../constants/narrators'

type Props = {
  character: StoryCharacter
  narratorId?: string
  busy?: boolean
  onBackToScene: () => void
  onRegeneratePortrait: () => void
}

export function CharacterPreviewMode({
  character: c,
  narratorId,
  busy = false,
  onBackToScene,
  onRegeneratePortrait
}: Props) {
  const uiText = useUiText()
  const preset = NARRATOR_UI_PRESETS.find((n) => n.id === normalizeNarratorId(narratorId ?? ''))
  const voiceLabel = preset ? uiText(preset.labelKey) : uiText('cineNarratorAi')

  return (
    <div className="character-preview-mode" role="region" aria-label={uiText('characterPreviewTitle')}>
      <button type="button" className="btn btn-ghost character-preview-mode__back" onClick={onBackToScene}>
        {uiText('characterPreviewBackScene')}
      </button>
      <div className="character-preview-mode__hero">
        {c.baseImageUrl ? (
          <img src={c.baseImageUrl} alt={c.name} className="character-preview-mode__img" />
        ) : (
          <div className="character-preview-mode__placeholder" aria-hidden />
        )}
      </div>
      <div className="character-preview-mode__meta">
        <h2 className="character-preview-mode__name">{c.name}</h2>
        {c.role ? <p className="character-preview-mode__role">{c.role}</p> : null}
        {c.appearance?.trim() ? (
          <p className="character-preview-mode__desc">
            <span className="character-preview-mode__label">{uiText('characterPreviewAppearance')}</span>
            {c.appearance.trim()}
          </p>
        ) : c.visualIdentity?.trim() ? (
          <p className="character-preview-mode__desc">
            <span className="character-preview-mode__label">{uiText('characterPreviewAppearance')}</span>
            {c.visualIdentity.trim()}
          </p>
        ) : null}
        {c.personality?.trim() ? (
          <p className="character-preview-mode__personality">
            <span className="character-preview-mode__label">{uiText('characterPreviewPersonality')}</span>
            {c.personality.trim()}
          </p>
        ) : null}
        <p className="character-preview-mode__voice">
          <span className="character-preview-mode__label">{uiText('characterPreviewVoice')}</span>
          {voiceLabel}
        </p>
        {(c.age || c.gender) && (
          <p className="character-preview-mode__traits">
            {[c.age, c.gender].filter(Boolean).join(` ${Glyphs.middot} `)}
          </p>
        )}
        <button
          type="button"
          className="btn btn-generate-cta character-preview-mode__regen"
          disabled={busy}
          onClick={onRegeneratePortrait}
        >
          {uiText('characterPreviewRegenerate')}
        </button>
      </div>
    </div>
  )
}
