import { useUiText } from '../i18n/useAppI18n'
import { Glyphs } from '../i18n/uiGlyphs'
import type { StoryCharacter } from '../types/story'
import { NARRATOR_UI_PRESETS } from '../constants/narrators'
import { normalizeNarratorId } from '../constants/narrators'
import { cinematicFitImgStyle, useCinematicImageFit } from '../hooks/useCinematicImageFit'

type Props = {
  character: StoryCharacter
  narratorId?: string
  busy?: boolean
  onBackToScene: () => void
  onRegeneratePortrait: () => void
  onUploadReference?: () => void
}

export function CharacterPreviewMode({
  character: c,
  narratorId,
  busy = false,
  onBackToScene,
  onRegeneratePortrait,
  onUploadReference
}: Props) {
  const uiText = useUiText()
  const preset = NARRATOR_UI_PRESETS.find((n) => n.id === normalizeNarratorId(narratorId ?? ''))
  const voiceLabel = preset ? uiText(preset.labelKey) : uiText('cineNarratorAi')
  const fitAxis = useCinematicImageFit(c.baseImageUrl)

  return (
    <div
      className="character-preview-mode character-preview-mode--fill"
      role="region"
      aria-label={uiText('characterPreviewTitle')}
    >
      <button
        type="button"
        className="btn btn-ghost character-preview-mode__back"
        onClick={onBackToScene}
        aria-label={uiText('characterPreviewBackScene')}
        title={uiText('characterPreviewBackScene')}
      />
      <div className="character-preview-mode__hero character-preview-mode__hero--fill">
        {c.baseImageUrl ? (
          <img
            src={c.baseImageUrl}
            alt={c.name}
            className="character-preview-mode__img character-preview-mode__img--fit"
            style={cinematicFitImgStyle(fitAxis)}
          />
        ) : (
          <div className="character-preview-mode__placeholder" aria-hidden />
        )}
      </div>
      <div className="character-preview-mode__meta character-preview-mode__meta--dock">
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
        <div className="character-preview-mode__actions">
          <button
            type="button"
            className="btn btn-ghost btn-small"
            disabled={busy}
            onClick={onRegeneratePortrait}
          >
            {uiText('characterActionRegenerate')}
          </button>
          {onUploadReference ? (
            <button
              type="button"
              className="btn btn-ghost btn-small"
              disabled={busy}
              onClick={onUploadReference}
            >
              {uiText('characterActionUploadRef')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
