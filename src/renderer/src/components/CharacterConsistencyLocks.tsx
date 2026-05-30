import { useUiText } from '../i18n/useAppI18n'
import type { CharacterConsistencyLocks as Locks } from '../types/story'

const LOCK_KEYS: (keyof Locks)[] = [
  'lockFace',
  'lockHair',
  'lockClothing',
  'lockAge',
  'lockVoice',
  'lockPersonality'
]

const LOCK_I18N: Record<keyof Locks, string> = {
  lockFace: 'consistencyLockFace',
  lockHair: 'consistencyLockHair',
  lockClothing: 'consistencyLockClothing',
  lockAge: 'consistencyLockAge',
  lockVoice: 'consistencyLockVoice',
  lockPersonality: 'consistencyLockPersonality'
}

type Props = {
  locks: Locks
  disabled?: boolean
  onChange: (locks: Locks) => void
}

export function CharacterConsistencyLocks({ locks, disabled = false, onChange }: Props) {
  const uiText = useUiText()

  return (
    <fieldset className="character-consistency-locks" disabled={disabled}>
      <legend>{uiText('consistencyLocksTitle')}</legend>
      <ul className="character-consistency-locks__list">
        {LOCK_KEYS.map((key) => (
          <li key={key}>
            <label className="character-consistency-locks__item">
              <input
                type="checkbox"
                checked={Boolean(locks[key])}
                onChange={(e) => onChange({ ...locks, [key]: e.target.checked })}
              />
              {uiText(LOCK_I18N[key])}
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  )
}
