import { useRef, useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'

export type SmartRegenAction =
  | 'image'
  | 'script'
  | 'dialogue'
  | 'narration'
  | 'motion'
  | 'scene'

type Props = {
  disabled?: boolean
  onAction: (action: SmartRegenAction) => void
}

export function SmartSceneRegenMenu({ disabled = false, onAction }: Props) {
  const uiText = useUiText()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const items: { id: SmartRegenAction; labelKey: string }[] = [
    { id: 'image', labelKey: 'smartRegenImage' },
    { id: 'script', labelKey: 'smartRegenScript' },
    { id: 'dialogue', labelKey: 'smartRegenDialogue' },
    { id: 'narration', labelKey: 'smartRegenNarration' },
    { id: 'motion', labelKey: 'smartRegenMotion' },
    { id: 'scene', labelKey: 'smartRegenScene' }
  ]

  return (
    <div className="smart-scene-regen" ref={rootRef}>
      <button
        type="button"
        className="btn btn-ghost btn-small"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
      >
        {uiText('smartRegenMenu')}
      </button>
      {open ? (
        <ul className="smart-scene-regen__menu" role="menu">
          {items.map((item) => (
            <li key={item.id} role="none">
              <button
                type="button"
                role="menuitem"
                className="smart-scene-regen__item"
                onClick={(e) => {
                  e.stopPropagation()
                  setOpen(false)
                  onAction(item.id)
                }}
              >
                {uiText(item.labelKey)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
