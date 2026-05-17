import { useEffect, useMemo, useRef, useState } from 'react'

const PREVIEW_EVENT = 'katha-narrator-preview'
const PREVIEW_STOP_EVENT = 'katha-narrator-preview-stop'

type AvatarSpec = {
  id: string
  skinA: string
  skinB: string
  hairA: string
  hairB: string
  clothA: string
  clothB: string
  rim: string
  eye: string
  brow: string
  mouth: string
}

function avatarSpec(id: string): AvatarSpec {
  // Deterministic: hard-mapped to canonical narrator id (legacy ids normalized upstream).
  switch (id) {
    case 'tryst_bj':
      return {
        id,
        skinA: '#caa184',
        skinB: '#a9785f',
        hairA: '#14151a',
        hairB: '#2a2c35',
        clothA: '#0b1220',
        clothB: '#111827',
        rim: 'rgba(251,191,36,0.55)',
        eye: '#0b1220',
        brow: '#1f2937',
        mouth: '#3b1f1f'
      }
    case 'penguin':
      return {
        id,
        skinA: '#e1b9a8',
        skinB: '#c0887b',
        hairA: '#1a1b22',
        hairB: '#34384a',
        clothA: '#111827',
        clothB: '#0b1220',
        rim: 'rgba(59,130,246,0.4)',
        eye: '#0b1220',
        brow: '#1f2937',
        mouth: '#5a2730'
      }
    default:
      return avatarSpec('tryst_bj')
  }
}

type Props = {
  narratorId: string
}

/**
 * Cinematic semi-realistic SVG avatar (deterministic) with lightweight idle + speaking animation.
 * No WebGL / no heavy runtime rendering.
 */
export function NarratorAnimatedAvatar({ narratorId }: Props) {
  const spec = useMemo(() => avatarSpec(narratorId), [narratorId])
  const [speaking, setSpeaking] = useState(false)
  const speakingTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const stopTimer = () => {
      if (speakingTimerRef.current != null) {
        window.clearTimeout(speakingTimerRef.current)
        speakingTimerRef.current = null
      }
    }
    const onStart = (e: Event) => {
      const d = (e as CustomEvent<{ id?: string }>).detail
      if (d?.id !== narratorId) return
      stopTimer()
      setSpeaking(true)
      // Safety: auto-stop if a stop event is missed.
      speakingTimerRef.current = window.setTimeout(() => setSpeaking(false), 4500)
    }
    const onStop = (e: Event) => {
      const d = (e as CustomEvent<{ id?: string }>).detail
      if (d?.id !== narratorId) return
      stopTimer()
      setSpeaking(false)
    }
    window.addEventListener(PREVIEW_EVENT, onStart as EventListener)
    window.addEventListener(PREVIEW_STOP_EVENT, onStop as EventListener)
    return () => {
      stopTimer()
      window.removeEventListener(PREVIEW_EVENT, onStart as EventListener)
      window.removeEventListener(PREVIEW_STOP_EVENT, onStop as EventListener)
    }
  }, [narratorId])

  return (
    <svg
      className={`narrator-anim-avatar ${speaking ? 'narrator-anim-avatar--speaking' : ''}`}
      viewBox="0 0 96 96"
      width="48"
      height="48"
      role="img"
      aria-label=""
    >
      <defs>
        <radialGradient id={`skin-${spec.id}`} cx="38%" cy="32%" r="70%">
          <stop offset="0%" stopColor={spec.skinA} />
          <stop offset="62%" stopColor={spec.skinB} />
          <stop offset="100%" stopColor="rgba(0,0,0,0.18)" />
        </radialGradient>
        <linearGradient id={`hair-${spec.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={spec.hairB} />
          <stop offset="55%" stopColor={spec.hairA} />
          <stop offset="100%" stopColor="#09090b" />
        </linearGradient>
        <linearGradient id={`cloth-${spec.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={spec.clothA} />
          <stop offset="100%" stopColor={spec.clothB} />
        </linearGradient>
        <filter id={`soft-${spec.id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="rgba(0,0,0,0.35)" />
        </filter>
      </defs>

      {/* Rim light */}
      <circle cx="48" cy="48" r="46" fill="rgba(0,0,0,0.25)" />
      <circle cx="48" cy="48" r="45" fill={spec.rim} opacity="0.18" />

      {/* Head group (idle micro motion) */}
      <g className="narrator-anim-avatar__head" filter={`url(#soft-${spec.id})`}>
        {/* Neck + cloth */}
        <path
          d="M30 88c3-15 12-22 18-22h0c6 0 15 7 18 22"
          fill={`url(#cloth-${spec.id})`}
          opacity="0.98"
        />
        <path d="M41 70c2 6 12 6 14 0v10H41V70z" fill={`url(#skin-${spec.id})`} opacity="0.9" />

        {/* Face */}
        <ellipse cx="48" cy="44.5" rx="23.5" ry="26.5" fill={`url(#skin-${spec.id})`} />

        {/* Hair cap */}
        <path
          d="M24 43c2-18 15-30 32-30s30 12 32 30c-6-10-18-16-32-16S30 33 24 43z"
          fill={`url(#hair-${spec.id})`}
          opacity="0.98"
        />

        {/* Eyes (blink via scaleY) */}
        <g className="narrator-anim-avatar__eyes">
          <ellipse cx="39" cy="46" rx="4.8" ry="3.6" fill="rgba(255,255,255,0.92)" />
          <ellipse cx="57" cy="46" rx="4.8" ry="3.6" fill="rgba(255,255,255,0.92)" />
          <circle cx="40.2" cy="46.3" r="1.9" fill={spec.eye} />
          <circle cx="58.2" cy="46.3" r="1.9" fill={spec.eye} />
          <circle cx="40.9" cy="45.7" r="0.55" fill="rgba(255,255,255,0.85)" />
          <circle cx="58.9" cy="45.7" r="0.55" fill="rgba(255,255,255,0.85)" />
        </g>

        {/* Brows */}
        <path d="M34 40c3-2 7-3 11-1" stroke={spec.brow} strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
        <path d="M51 39c4-2 8-1 11 1" stroke={spec.brow} strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />

        {/* Nose + cheek shading */}
        <path d="M48 44c-1 6 0 10 4 12" stroke="rgba(0,0,0,0.12)" strokeWidth="2" strokeLinecap="round" fill="none" />
        <ellipse cx="34" cy="52" rx="7" ry="4.5" fill="rgba(255,255,255,0.08)" />
        <ellipse cx="62" cy="52" rx="7" ry="4.5" fill="rgba(255,255,255,0.06)" />

        {/* Mouth (idle + speaking anim via scaleY) */}
        <g className="narrator-anim-avatar__mouth">
          <path d="M40 60c4 4 12 4 16 0" stroke={spec.mouth} strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <ellipse cx="48" cy="61.2" rx="7.5" ry="3.2" fill={spec.mouth} opacity="0.18" />
        </g>
      </g>
    </svg>
  )
}

