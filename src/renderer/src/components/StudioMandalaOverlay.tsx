type Props = {
  visible: boolean
  /** Shown only to assistive tech (overlay is decorative). */
  statusLabel?: string
}

/** Ambient Nepal-inspired loader — pointer-events none so the UI stays usable. */
export function StudioMandalaOverlay({ visible, statusLabel }: Props) {
  if (!visible) return null

  return (
    <div className="studio-mandala-overlay" role="status" aria-live="polite" aria-label={statusLabel || undefined}>
      <svg className="studio-mandala-overlay__svg" viewBox="0 0 200 200">
        <defs>
          <linearGradient id="mandala-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(212,175,55,0.9)" />
            <stop offset="100%" stopColor="rgba(212,175,55,0.12)" />
          </linearGradient>
        </defs>
        <g transform="translate(100 100)">
          <g className="studio-mandala-overlay__ring studio-mandala-overlay__ring--a">
            {[0, 45, 90, 135].map((i) => (
              <ellipse
                key={i}
                cx="0"
                cy="0"
                rx="72"
                ry="72"
                fill="none"
                stroke="url(#mandala-gold)"
                strokeWidth="0.7"
                strokeDasharray="10 18"
                transform={`rotate(${i})`}
                opacity={0.5}
              />
            ))}
          </g>
          <g className="studio-mandala-overlay__ring studio-mandala-overlay__ring--b">
            {[0, 60, 120].map((i) => (
              <circle
                key={i}
                cx="0"
                cy="0"
                r="46"
                fill="none"
                stroke="rgba(212,175,55,0.35)"
                strokeWidth="0.6"
                strokeDasharray="4 12"
                transform={`rotate(${i})`}
              />
            ))}
          </g>
          <circle cx="0" cy="0" r="5" fill="rgba(212,175,55,0.55)" className="studio-mandala-overlay__core" />
        </g>
      </svg>
    </div>
  )
}
