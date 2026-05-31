import { motion } from 'framer-motion'
import { useRef } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import type { StoryCharacter } from '../types/story'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { CharacterReferenceUpload } from './CharacterReferenceUpload'

type Props = {
  character: StoryCharacter
  highlighted: boolean
  editMode: boolean
  storyMetaLocked: boolean
  busy: boolean
  showReferenceControls?: boolean
  characterId?: string
  onPreview: () => void
  onGeneratePortrait: () => void
  onReplacePortrait?: () => void
  onNameChange: (name: string) => void
  onPersonalityChange: (personality: string) => void
}

export function MonitorCharacterCard({
  character: c,
  highlighted,
  editMode,
  storyMetaLocked,
  busy,
  showReferenceControls,
  characterId,
  onPreview,
  onGeneratePortrait,
  onReplacePortrait,
  onNameChange,
  onPersonalityChange
}: Props) {
  const reduced = usePrefersReducedMotion()
  const uiText = useUiText()
  const uploadRef = useRef<HTMLDivElement>(null)

  const triggerUpload = () => {
    const input = uploadRef.current?.querySelector('input[type="file"]') as HTMLInputElement | null
    input?.click()
  }

  return (
    <motion.div
      layout={!reduced}
      className={`char-card monitor-char-card ${highlighted ? 'monitor-char-card--lit' : ''}`}
      data-char-id={characterId ?? c.id}
      animate={
        reduced
          ? undefined
          : highlighted
            ? {
                boxShadow: [
                  '0 0 0 1px rgba(212,175,55,0.35)',
                  '0 0 28px rgba(212,175,55,0.35)',
                  '0 0 0 1px rgba(212,175,55,0.35)'
                ]
              }
            : { boxShadow: '0 0 0 1px transparent' }
      }
      transition={highlighted ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.25 }}
    >
      {c.baseImageUrl ? (
        <motion.button
          type="button"
          className="char-card__thumb-btn monitor-char-card__thumb"
          aria-label={uiText('characterActionPreview')}
          onClick={onPreview}
          whileHover={reduced ? undefined : { scale: 1.04 }}
          animate={
            reduced
              ? undefined
              : highlighted
                ? { scale: [1, 1.03, 1] }
                : { scale: 1 }
          }
          transition={{ duration: 1.8, repeat: highlighted ? Infinity : 0, ease: 'easeInOut' }}
        >
          <img src={c.baseImageUrl} alt={c.name} />
        </motion.button>
      ) : (
        <div className="monitor-char-card__placeholder" />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {editMode ? (
          <>
            {storyMetaLocked ? (
              <div style={{ fontWeight: 700 }}>{c.name}</div>
            ) : (
              <input
                className="select"
                style={{ width: '100%', fontWeight: 700 }}
                value={c.name}
                onChange={(e) => onNameChange(e.target.value)}
              />
            )}
            <textarea
              className="idea-input monitor-char-card__personality-input"
              value={c.personality}
              onChange={(e) => onPersonalityChange(e.target.value)}
            />
            {showReferenceControls && editMode ? (
              <CharacterReferenceUpload characterId={characterId} />
            ) : null}
          </>
        ) : (
          <>
            <div className="monitor-char-card__name">{c.name}</div>
            <div className="monitor-char-card__personality">{c.personality}</div>
            {c.visualIdentity ? (
              <div className="monitor-char-card__costume" title={c.visualIdentity}>
                {c.visualIdentity.length > 96 ? `${c.visualIdentity.slice(0, 94)}…` : c.visualIdentity}
              </div>
            ) : null}
          </>
        )}
        <div ref={uploadRef} className="monitor-char-card__upload-host" hidden aria-hidden>
          <CharacterReferenceUpload characterId={characterId} />
        </div>
        <div className="monitor-char-card__actions">
          <button
            type="button"
            className="btn btn-ghost btn-small monitor-char-card__action-btn"
            disabled={Boolean(busy)}
            onClick={onPreview}
          >
            {uiText('characterActionPreview')}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-small monitor-char-card__action-btn"
            disabled={Boolean(busy)}
            onClick={onGeneratePortrait}
          >
            {uiText('characterActionRegenerate')}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-small monitor-char-card__action-btn"
            disabled={Boolean(busy)}
            onClick={triggerUpload}
          >
            {uiText('characterActionUploadRef')}
          </button>
          {onReplacePortrait ? (
            <button
              type="button"
              className="btn btn-ghost btn-small monitor-char-card__action-btn"
              disabled={Boolean(busy)}
              onClick={onReplacePortrait}
            >
              {uiText('characterActionReplaceImage')}
            </button>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}
