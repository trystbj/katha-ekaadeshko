import { useCallback, useEffect, useRef, useState } from 'react'
import { useUiText } from '../i18n/useAppI18n'
import { Glyphs } from '../i18n/uiGlyphs'
import { useStudioStore, type ThemeChoice } from '../store/useStudioStore'
import { IconMoon, IconSun, IconSystem } from './ThemeIcons'

type Props = { className?: string }

export function ThemeOneTap({ className }: Props) {
  const uiText = useUiText()
  const theme = useStudioStore((s) => s.theme)
  const setTheme = useStudioStore((s) => s.setTheme)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const apply = useCallback(
    (v: ThemeChoice) => {
      setTheme(v)
      setOpen(false)
    },
    [setTheme]
  )

  const currentIcon =
    theme === 'light' ? <IconSun /> : theme === 'dark' ? <IconMoon /> : <IconSystem />
  const currentLabel = theme === 'light' ? uiText('themeLight') : theme === 'dark' ? uiText('themeDark') : uiText('themeSystem')

  return (
    <div className={className ? `theme-onetap ${className}` : 'theme-onetap'} ref={wrapRef}>
      <button
        type="button"
        className="theme-onetap__trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={uiText('theme')}
        aria-label={uiText('theme')}
      >
        {currentIcon}
        <span className="theme-onetap__chev" aria-hidden>
          {Glyphs.caretDown}
        </span>
      </button>
      {open ? (
        <ul className="theme-onetap__menu" role="listbox">
          <li>
            <button
              type="button"
              className={theme === 'light' ? 'active' : undefined}
              onClick={() => apply('light')}
            >
              <IconSun /> {uiText('themeLight')}
            </button>
          </li>
          <li>
            <button
              type="button"
              className={theme === 'dark' ? 'active' : undefined}
              onClick={() => apply('dark')}
            >
              <IconMoon /> {uiText('themeDark')}
            </button>
          </li>
          <li>
            <button
              type="button"
              className={theme === 'system' ? 'active' : undefined}
              onClick={() => apply('system')}
            >
              <IconSystem /> {uiText('themeSystem')}
            </button>
          </li>
        </ul>
      ) : null}
      <span className="visually-hidden">{currentLabel}</span>
    </div>
  )
}
