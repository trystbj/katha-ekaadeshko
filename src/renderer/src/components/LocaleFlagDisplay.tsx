import { useState } from 'react'

export type LocaleFlagDisplayProps = {
  iso2?: string | null
  flag: string
  title: string
  /** Regional picker defaults lazy; app-language strip uses eager (monitor layout / viewport quirks). */
  loading?: 'eager' | 'lazy'
}

/** Same flag treatment as story “regional languages”: flagcdn PNG + emoji fallback. */
export function LocaleFlagDisplay({
  iso2,
  flag,
  title,
  loading = 'lazy'
}: LocaleFlagDisplayProps) {
  const [failed, setFailed] = useState(false)
  const safe = (iso2 ?? '').replace(/[^a-z]/gi, '').toLowerCase().slice(0, 2)

  if (!safe || failed) {
    return (
      <span className="studio-mock-locale-flag-emoji" aria-hidden title={title}>
        {flag}
      </span>
    )
  }

  return (
    <span className="studio-mock-locale-flag-wrap" title={title}>
      <img
        className="studio-mock-locale-flag-img"
        src={`https://flagcdn.com/w40/${safe}.png`}
        alt=""
        loading={loading}
        decoding="async"
        draggable={false}
        onError={() => setFailed(true)}
      />
    </span>
  )
}
