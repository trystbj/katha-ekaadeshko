import { motion } from 'framer-motion'
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
  onOpenPortrait: () => void
  onGeneratePortrait: () => void
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
  onOpenPortrait,
  onGeneratePortrait,
  onNameChange,
  onPersonalityChange
}: Props) {
  const reduced = usePrefersReducedMotion()
  const uiText = useUiText()

  return (
    <motion.div
      layout={!reduced}
      className={`char-card monitor-char-card ${highlighted ? 'monitor-char-card--lit' : ''}`}
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
          aria-label={uiText('imageFullscreenCharacter', { name: c.name })}
          onClick={onOpenPortrait}
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
            {showReferenceControls ? <CharacterReferenceUpload /> : null}
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
        <button
          type="button"
          className="btn btn-ghost btn-small monitor-char-card__leo"
          disabled={Boolean(busy)}
          onClick={onGeneratePortrait}
        >
          {uiText('leonardoBasePortrait')}
        </button>
      </div>
    </motion.div>
  )
}
