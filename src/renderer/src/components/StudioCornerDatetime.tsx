import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppI18n } from '../i18n/useAppI18n'
import { Glyphs } from '../i18n/uiGlyphs'
const STORAGE_KEY = 'katha-studio-corner-clock-mode'

type ClockMode = 'analog' | 'digital'

function splitCornerDigitalClockParts(date: Date, locale: string | undefined) {
  const fmt = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
  let hour = ''
  let minute = ''
  let second = ''
  let period = ''
  for (const p of fmt.formatToParts(date)) {
    if (p.type === 'hour') hour += p.value
    else if (p.type === 'minute') minute = p.value
    else if (p.type === 'second') second = p.value
    else if (p.type === 'dayPeriod') period = p.value.trim()
  }
  return {
    hour: hour.trim(),
    minute,
    second,
    period,
  }
}

/** Live clock + calendar date (studio corner); click toggles analog ↔ digital. */
export function StudioCornerDatetime() {
  const { uiText, i18n } = useAppI18n()
  const [mode, setMode] = useState<ClockMode>(() => {
    if (typeof window === 'undefined') return 'analog'
    const v = window.localStorage.getItem(STORAGE_KEY)
    return v === 'digital' ? 'digital' : 'analog'
  })
  const [now, setNow] = useState(() => new Date())

  const hourRef = useRef<SVGGElement>(null)
  const minuteRef = useRef<SVGGElement>(null)
  const secondRef = useRef<SVGGElement>(null)
  const reducedMotionRef = useRef(false)

  useEffect(() => {
    reducedMotionRef.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const tickHands = useCallback(() => {
    const h = hourRef.current
    const m = minuteRef.current
    const s = secondRef.current
    if (!h || !m || !s) return

    const d = new Date()
    const sec = d.getSeconds()
    let ms = d.getMilliseconds()
    if (reducedMotionRef.current) {
      ms = 0
    }
    const secF = sec + ms / 1000
    const minF = d.getMinutes() + secF / 60
    const hrF = (d.getHours() % 12) + minF / 60

    h.setAttribute('transform', `rotate(${hrF * 30} 60 60)`)
    m.setAttribute('transform', `rotate(${minF * 6} 60 60)`)
    s.setAttribute('transform', `rotate(${secF * 6} 60 60)`)
  }, [])

  useEffect(() => {
    if (mode !== 'analog') return
    tickHands()
    if (reducedMotionRef.current) {
      const id = window.setInterval(tickHands, 1000)
      return () => clearInterval(id)
    }
    let id = 0
    const loop = () => {
      tickHands()
      id = window.requestAnimationFrame(loop)
    }
    id = window.requestAnimationFrame(loop)
    return () => window.cancelAnimationFrame(id)
  }, [mode, tickHands])

  const toggleMode = () => {
    setMode((prev) => {
      const next: ClockMode = prev === 'analog' ? 'digital' : 'analog'
      try {
        window.localStorage.setItem(STORAGE_KEY, next)
      } catch {
        /* ignore quota / private mode */
      }
      return next
    })
  }

  const locale = i18n.language || undefined

  const dateLabel = useMemo(() => {
    const dateFmt = new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    return dateFmt.format(now)
  }, [locale, now])

  const digitalParts = useMemo(() => splitCornerDigitalClockParts(now, locale), [locale, now])

  const tickMarks = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const rad = (i * 30 * Math.PI) / 180
      const sin = Math.sin(rad)
      const cos = Math.cos(rad)
      return (
        <line
          key={i}
          x1={60 + sin * 53}
          y1={60 - cos * 53}
          x2={60 + sin * 46}
          y2={60 - cos * 46}
          stroke="#000000"
          strokeWidth={i % 3 === 0 ? 2 : 1}
          strokeLinecap="round"
        />
      )
    })
  }, [])

  const aria = uiText('studioCornerClockToggle')

  return (
    <button
      type="button"
      className="studio-mock-corner-datetime studio-mock-corner-datetime--toggleable"
      data-clock-mode={mode}
      aria-live="polite"
      aria-label={aria}
      title={aria}
      onClick={toggleMode}
    >
      {mode === 'digital' ? (
        <>
          <time
            className="studio-corner-clock-digital"
            dateTime={now.toISOString()}
          >
            <span className="studio-corner-clock-digital__hour-row">
              <span className="studio-corner-clock-digital__hour">{digitalParts.hour}</span>
              {digitalParts.period ? (
                <span className="studio-corner-clock-digital__period">{digitalParts.period}</span>
              ) : null}
            </span>
            <span className="studio-corner-clock-digital__subrow">
              <span className="studio-corner-clock-digital__mm">{digitalParts.minute}</span>
              <span className="studio-corner-clock-digital__colon" aria-hidden>
                {Glyphs.colon}
              </span>
              <span className="studio-corner-clock-digital__ss">{digitalParts.second}</span>
            </span>
          </time>
          <span className="studio-mock-corner-datetime__date studio-mock-corner-datetime__date--digital-below">
            {dateLabel}
          </span>
        </>
      ) : (
        <span className="studio-mock-corner-datetime__analog-cluster">
          <svg
            className="studio-corner-clock__face"
            viewBox="0 0 120 120"
            width={88}
            height={88}
            aria-hidden
          >
            <defs>
              <linearGradient id="studio-corner-clock-glass" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.07)" />
                <stop offset="55%" stopColor="rgba(255,255,255,0.02)" />
                <stop offset="100%" stopColor="rgba(180,210,230,0.06)" />
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r="54" fill="url(#studio-corner-clock-glass)" />
            <circle
              cx="60"
              cy="60"
              r="53.5"
              fill="none"
              stroke="rgba(255, 252, 248, 0.18)"
              strokeWidth="1"
            />
            {tickMarks}
            <g ref={hourRef}>
              <line
                x1="60"
                y1="60"
                x2="60"
                y2="38"
                stroke="#c9973f"
                strokeWidth="4.2"
                strokeLinecap="round"
              />
            </g>
            <g ref={minuteRef}>
              <line
                x1="60"
                y1="60"
                x2="60"
                y2="26"
                stroke="#64b4dc"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            </g>
            <g ref={secondRef}>
              <line
                x1="60"
                y1="66"
                x2="60"
                y2="20"
                stroke="#000000"
                strokeWidth="1.35"
                strokeLinecap="round"
              />
            </g>
            <circle cx="60" cy="60" r="3.4" fill="#f4f8fb" stroke="rgba(0, 0, 0, 0.18)" strokeWidth="0.65" />
          </svg>
          <span className="studio-mock-corner-datetime__date studio-mock-corner-datetime__date--analog-below">
            {dateLabel}
          </span>
        </span>
      )}
    </button>
  )
}
